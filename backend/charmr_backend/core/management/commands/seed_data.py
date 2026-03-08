from django.core.management.base import BaseCommand

from core.models import Permission, Role


PERMISSIONS = [
    ("users.view", "View users", "users"),
    ("users.manage", "Manage users", "users"),
    ("members.view", "View members", "members"),
    ("members.edit", "Edit members", "members"),
    ("members.manage", "Manage members", "members"),
    ("families.view", "View families", "families"),
    ("families.edit", "Edit families", "families"),
    ("families.manage", "Manage families", "families"),
    ("events.view", "View events", "events"),
    ("events.edit", "Edit events", "events"),
    ("events.manage", "Manage events", "events"),
    ("roles.view", "View roles", "roles"),
    ("roles.manage", "Manage roles", "roles"),
    ("guardianships.view", "View guardianships", "guardianships"),
    ("guardianships.manage", "Manage guardianships", "guardianships"),
    ("regions.view", "View regions", "regions"),
    ("regions.manage", "Manage regions", "regions"),
    ("reports.view", "View reports", "reports"),
    ("reports.export", "Export reports", "reports"),
]

ROLES = {
    "Organisational Admin": {
        "description": "Full access to all platform features across all scopes",
        "is_system_role": True,
        "permissions": "*",
    },
    "Regional Organiser": {
        "description": "Manage events and members within a specific region",
        "is_system_role": False,
        "permissions": [
            "events.view", "events.edit",
            "members.view", "members.edit",
            "families.view", "families.edit",
            "guardianships.view",
            "regions.view",
        ],
    },
    "Family Contact": {
        "description": "Primary contact for a family unit",
        "is_system_role": False,
        "permissions": [
            "families.view", "families.edit",
            "members.view",
        ],
    },
    "Family Member": {
        "description": "Standard family member with view access to own data",
        "is_system_role": False,
        "permissions": [
            "members.view",
        ],
    },
}


class Command(BaseCommand):
    help = "Seed application permissions and roles"

    def handle(self, *args, **options):
        self._seed_permissions()
        self._seed_roles()
        self.stdout.write(self.style.SUCCESS("Seed data loaded successfully"))

    def _seed_permissions(self):
        created = 0
        for codename, name, category in PERMISSIONS:
            _, was_created = Permission.objects.get_or_create(
                codename=codename, defaults={"name": name, "category": category}
            )
            if was_created:
                created += 1
        self.stdout.write(f"  Permissions: {created} created, {len(PERMISSIONS) - created} already existed")

    def _seed_roles(self):
        all_perms = {p.codename: p for p in Permission.objects.all()}
        created = 0
        for role_name, config in ROLES.items():
            role, was_created = Role.objects.get_or_create(
                name=role_name,
                defaults={
                    "description": config["description"],
                    "is_system_role": config["is_system_role"],
                },
            )
            if was_created:
                created += 1

            if config["permissions"] == "*":
                role.permissions.set(Permission.objects.all())
            else:
                perm_objects = [all_perms[code] for code in config["permissions"] if code in all_perms]
                role.permissions.set(perm_objects)

        self.stdout.write(f"  Roles: {created} created, {len(ROLES) - created} already existed")
