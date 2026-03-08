from rest_framework.permissions import BasePermission

from core.models import RoleAssignment


def get_user_permissions(user):
    """Collect all permission codenames for a user across all role assignments (direct + group)."""
    if not user or not user.is_authenticated:
        return set()

    direct = RoleAssignment.objects.filter(user=user).select_related("role")
    group_ids = user.groups.values_list("id", flat=True)
    via_group = RoleAssignment.objects.filter(group_id__in=group_ids).select_related("role")

    perms = set()
    for ra in list(direct) + list(via_group):
        for p in ra.role.permissions.values_list("codename", flat=True):
            perms.add(p)
    return perms


class HasPermission(BasePermission):
    """
    DRF permission that checks the requesting user holds a specific
    permission codename via their RoleAssignment(s).

    Usage on a view:
        permission_classes = [HasPermission]
        required_permission = "users.manage"

    For list views that only need read access, set required_permission
    on the view and optionally a write_permission for mutating actions.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        required = getattr(view, "required_permission", None)
        write_perm = getattr(view, "write_permission", None)

        if request.method in ("GET", "HEAD", "OPTIONS"):
            perm_needed = required
        else:
            perm_needed = write_perm or required

        if not perm_needed:
            return True

        user_perms = get_user_permissions(request.user)
        return perm_needed in user_perms
