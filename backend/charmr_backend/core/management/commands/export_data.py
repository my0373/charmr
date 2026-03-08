import sys

import yaml
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

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
    help = "Export all platform data to YAML"

    def add_arguments(self, parser):
        parser.add_argument(
            "-o", "--output",
            type=str,
            default="-",
            help="Output file path (default: stdout)",
        )

    def handle(self, *args, **options):
        data = {
            "charmr_export": {
                "version": 1,
            },
            "permissions": [
                {
                    "codename": p.codename,
                    "name": p.name,
                    "category": p.category,
                }
                for p in Permission.objects.all()
            ],
            "regions": [
                {
                    "name": r.name,
                    "code": r.code,
                }
                for r in Region.objects.all()
            ],
            "roles": [
                {
                    "name": r.name,
                    "description": r.description,
                    "is_system_role": r.is_system_role,
                    "permissions": list(
                        r.permissions.values_list("codename", flat=True)
                    ),
                }
                for r in Role.objects.prefetch_related("permissions").all()
            ],
            "families": [
                {
                    "name": f.name,
                    "status": f.status,
                }
                for f in Family.objects.all()
            ],
            "users": [
                {
                    "username": u.username,
                    "email": u.email,
                    "first_name": u.first_name,
                    "last_name": u.last_name,
                    "is_staff": u.is_staff,
                    "is_active": u.is_active,
                }
                for u in User.objects.all()
                if not u.is_superuser
            ],
            "people": [
                {
                    "first_name": p.first_name,
                    "last_name": p.last_name,
                    "date_of_birth": p.date_of_birth.isoformat() if p.date_of_birth else None,
                    "email": p.email,
                    "phone": p.phone,
                    "family": p.family.name,
                    "user": p.user.username if p.user else None,
                }
                for p in Person.objects.select_related("family", "user").all()
            ],
            "role_assignments": [
                {
                    "user": ra.user.username if ra.user else None,
                    "group": ra.group.name if ra.group else None,
                    "role": ra.role.name,
                    "scope_type": ra.scope_type,
                    "scope_ref": _scope_ref(ra),
                }
                for ra in RoleAssignment.objects.select_related(
                    "user", "group", "role"
                ).all()
            ],
            "guardianships": [
                {
                    "guardian": f"{g.guardian.first_name} {g.guardian.last_name}",
                    "guardian_family": g.guardian.family.name,
                    "ward": f"{g.ward.first_name} {g.ward.last_name}",
                    "ward_family": g.ward.family.name,
                    "status": g.status,
                }
                for g in Guardianship.objects.select_related(
                    "guardian", "guardian__family",
                    "ward", "ward__family",
                ).all()
            ],
        }

        yaml_str = yaml.dump(data, default_flow_style=False, sort_keys=False, allow_unicode=True)

        output = options["output"]
        if output == "-":
            sys.stdout.write(yaml_str)
        else:
            with open(output, "w") as f:
                f.write(yaml_str)
            self.stdout.write(self.style.SUCCESS(f"Exported to {output}"))


def _scope_ref(ra):
    """Return a human-readable scope reference instead of an opaque ID."""
    if ra.scope_type == "global":
        return None
    if ra.scope_type == "region" and ra.scope_id:
        r = Region.objects.filter(pk=ra.scope_id).first()
        return r.code if r else str(ra.scope_id)
    if ra.scope_type == "family" and ra.scope_id:
        f = Family.objects.filter(pk=ra.scope_id).first()
        return f.name if f else str(ra.scope_id)
    return None
