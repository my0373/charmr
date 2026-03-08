import yaml
from django.contrib.auth.models import Group, User
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from core.models import (
    Family,
    Guardianship,
    Permission,
    Person,
    Region,
    Role,
    RoleAssignment,
)


class Command(BaseCommand):
    help = "Populate platform data from a YAML file"

    def add_arguments(self, parser):
        parser.add_argument("file", type=str, help="Path to the YAML data file")
        parser.add_argument(
            "--wipe",
            action="store_true",
            help="Delete all existing data before importing",
        )
        parser.add_argument(
            "--default-password",
            type=str,
            default="changeme",
            help="Default password for newly created users (default: changeme)",
        )

    def handle(self, *args, **options):
        filepath = options["file"]
        try:
            with open(filepath) as f:
                data = yaml.safe_load(f)
        except FileNotFoundError:
            raise CommandError(f"File not found: {filepath}")
        except yaml.YAMLError as e:
            raise CommandError(f"Invalid YAML: {e}")

        if not data or "charmr_export" not in data:
            raise CommandError("Not a valid Charmr export file (missing charmr_export header)")

        with transaction.atomic():
            if options["wipe"]:
                self._wipe()
            self._import(data, options["default_password"])

        self.stdout.write(self.style.SUCCESS("Data populated successfully"))

    def _wipe(self):
        self.stdout.write("  Wiping existing data...")
        Guardianship.objects.all().delete()
        RoleAssignment.objects.all().delete()
        Person.objects.all().delete()
        Family.objects.all().delete()
        Role.objects.all().delete()
        Permission.objects.all().delete()
        Region.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()
        self.stdout.write("  Wipe complete")

    def _import(self, data, default_password):
        # Permissions
        perms = data.get("permissions", [])
        perm_map = {}
        for p in perms:
            obj, created = Permission.objects.get_or_create(
                codename=p["codename"],
                defaults={"name": p["name"], "category": p["category"]},
            )
            perm_map[p["codename"]] = obj
        self.stdout.write(f"  Permissions: {len(perms)} processed")

        # Regions
        region_list = data.get("regions", [])
        region_map = {}
        for r in region_list:
            obj, _ = Region.objects.get_or_create(
                code=r["code"], defaults={"name": r["name"]}
            )
            region_map[r["code"]] = obj
        self.stdout.write(f"  Regions: {len(region_list)} processed")

        # Roles
        role_list = data.get("roles", [])
        role_map = {}
        for r in role_list:
            obj, _ = Role.objects.get_or_create(
                name=r["name"],
                defaults={
                    "description": r.get("description", ""),
                    "is_system_role": r.get("is_system_role", False),
                },
            )
            perm_codenames = r.get("permissions", [])
            perm_objects = [perm_map[c] for c in perm_codenames if c in perm_map]
            obj.permissions.set(perm_objects)
            role_map[r["name"]] = obj
        self.stdout.write(f"  Roles: {len(role_list)} processed")

        # Families
        family_list = data.get("families", [])
        family_map = {}
        for f in family_list:
            obj, _ = Family.objects.get_or_create(
                name=f["name"],
                defaults={"status": f.get("status", "active")},
            )
            family_map[f["name"]] = obj
        self.stdout.write(f"  Families: {len(family_list)} processed")

        # Users
        user_list = data.get("users", [])
        user_map = {}
        for u in user_list:
            obj, created = User.objects.get_or_create(
                username=u["username"],
                defaults={
                    "email": u.get("email", ""),
                    "first_name": u.get("first_name", ""),
                    "last_name": u.get("last_name", ""),
                    "is_staff": u.get("is_staff", False),
                    "is_active": u.get("is_active", True),
                },
            )
            if created:
                obj.set_password(default_password)
                obj.save()
            user_map[u["username"]] = obj
        # Also populate existing users for FK lookups
        for u in User.objects.all():
            user_map[u.username] = u
        self.stdout.write(f"  Users: {len(user_list)} processed")

        # People
        person_list = data.get("people", [])
        for p in person_list:
            family = family_map.get(p.get("family"))
            if not family:
                self.stderr.write(f"  WARNING: family '{p.get('family')}' not found for {p['first_name']} {p['last_name']}, skipping")
                continue
            user = user_map.get(p.get("user")) if p.get("user") else None
            lookup = {"first_name": p["first_name"], "last_name": p["last_name"], "family": family}
            defaults = {
                "email": p.get("email", ""),
                "phone": p.get("phone", ""),
                "date_of_birth": p.get("date_of_birth"),
            }
            if user:
                defaults["user"] = user
            Person.objects.get_or_create(**lookup, defaults=defaults)
        self.stdout.write(f"  People: {len(person_list)} processed")

        # Role assignments
        ra_list = data.get("role_assignments", [])
        for ra in ra_list:
            role = role_map.get(ra.get("role"))
            if not role:
                self.stderr.write(f"  WARNING: role '{ra.get('role')}' not found, skipping assignment")
                continue

            user = user_map.get(ra.get("user")) if ra.get("user") else None
            group = None
            if ra.get("group"):
                group, _ = Group.objects.get_or_create(name=ra["group"])

            scope_type = ra.get("scope_type", "global")
            scope_id = None
            scope_ref = ra.get("scope_ref")
            if scope_type == "region" and scope_ref:
                region = region_map.get(scope_ref)
                scope_id = region.pk if region else None
            elif scope_type == "family" and scope_ref:
                fam = family_map.get(scope_ref)
                scope_id = fam.pk if fam else None

            if not user and not group:
                continue

            RoleAssignment.objects.get_or_create(
                user=user,
                group=group,
                role=role,
                scope_type=scope_type,
                defaults={"scope_id": scope_id},
            )
        self.stdout.write(f"  Role assignments: {len(ra_list)} processed")

        # Guardianships
        g_list = data.get("guardianships", [])
        for g in g_list:
            guardian_names = g["guardian"].split(" ", 1)
            ward_names = g["ward"].split(" ", 1)
            guardian_family = family_map.get(g.get("guardian_family"))
            ward_family = family_map.get(g.get("ward_family"))

            if not guardian_family or not ward_family:
                continue

            guardian = Person.objects.filter(
                first_name=guardian_names[0],
                last_name=guardian_names[1] if len(guardian_names) > 1 else "",
                family=guardian_family,
            ).first()
            ward = Person.objects.filter(
                first_name=ward_names[0],
                last_name=ward_names[1] if len(ward_names) > 1 else "",
                family=ward_family,
            ).first()

            if guardian and ward:
                Guardianship.objects.get_or_create(
                    guardian=guardian,
                    ward=ward,
                    defaults={"status": g.get("status", "pending")},
                )
        self.stdout.write(f"  Guardianships: {len(g_list)} processed")
