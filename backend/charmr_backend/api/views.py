import io
import os
import tempfile

import yaml
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.core.management import call_command
from django.http import HttpResponse
from django.middleware.csrf import get_token
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from core.models import (
    Family,
    Guardianship,
    Permission,
    Person,
    Region,
    Role,
    RoleAssignment,
)

from .permissions import HasPermission, get_user_permissions
from .serializers import (
    FamilySerializer,
    GuardianshipSerializer,
    PermissionSerializer,
    PersonSerializer,
    ProfileSerializer,
    RegionSerializer,
    RoleAssignmentSerializer,
    RoleSerializer,
    UserCreateSerializer,
    UserSerializer,
)


# ── Health & Auth (unchanged) ──────────────────────────────────────

@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    return Response({"status": "ok"})


@api_view(["POST"])
@permission_classes([AllowAny])
def auth_login(request):
    username = request.data.get("username", "")
    password = request.data.get("password", "")

    user = authenticate(request, username=username, password=password)
    if user is None:
        return Response(
            {"detail": "Invalid credentials."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    login(request, user)
    return Response({
        "id": user.pk,
        "username": user.username,
        "email": user.email,
        "is_staff": user.is_staff,
    })


@api_view(["POST"])
@permission_classes([AllowAny])
def auth_logout(request):
    logout(request)
    return Response({"detail": "Logged out."})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def auth_me(request):
    user = request.user
    return Response({
        "id": user.pk,
        "username": user.username,
        "email": user.email,
        "is_staff": user.is_staff,
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def csrf_token(request):
    return Response({"csrfToken": get_token(request)})


# ── Regions ────────────────────────────────────────────────────────

class RegionList(generics.ListCreateAPIView):
    queryset = Region.objects.all()
    serializer_class = RegionSerializer
    permission_classes = [HasPermission]
    required_permission = "regions.view"
    write_permission = "regions.manage"


class RegionDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Region.objects.all()
    serializer_class = RegionSerializer
    permission_classes = [HasPermission]
    required_permission = "regions.view"
    write_permission = "regions.manage"


# ── Families ───────────────────────────────────────────────────────

class FamilyList(generics.ListCreateAPIView):
    queryset = Family.objects.all()
    serializer_class = FamilySerializer
    permission_classes = [HasPermission]
    required_permission = "families.view"
    write_permission = "families.manage"


class FamilyDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Family.objects.all()
    serializer_class = FamilySerializer
    permission_classes = [HasPermission]
    required_permission = "families.view"
    write_permission = "families.manage"


# ── People ─────────────────────────────────────────────────────────

class PersonList(generics.ListCreateAPIView):
    queryset = Person.objects.select_related("family", "user").all()
    serializer_class = PersonSerializer
    permission_classes = [HasPermission]
    required_permission = "members.view"
    write_permission = "members.manage"


class PersonDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Person.objects.select_related("family", "user").all()
    serializer_class = PersonSerializer
    permission_classes = [HasPermission]
    required_permission = "members.view"
    write_permission = "members.manage"


# ── Roles ──────────────────────────────────────────────────────────

class RoleList(generics.ListCreateAPIView):
    queryset = Role.objects.prefetch_related("permissions").all()
    serializer_class = RoleSerializer
    permission_classes = [HasPermission]
    required_permission = "roles.view"
    write_permission = "roles.manage"


class RoleDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Role.objects.prefetch_related("permissions").all()
    serializer_class = RoleSerializer
    permission_classes = [HasPermission]
    required_permission = "roles.view"
    write_permission = "roles.manage"

    def perform_destroy(self, instance):
        if instance.is_system_role:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("System roles cannot be deleted.")
        instance.delete()


# ── Permissions ────────────────────────────────────────────────────

class PermissionList(generics.ListAPIView):
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    permission_classes = [HasPermission]
    required_permission = "roles.view"


# ── Role Assignments ──────────────────────────────────────────────

class RoleAssignmentList(generics.ListCreateAPIView):
    queryset = RoleAssignment.objects.select_related("user", "group", "role").all()
    serializer_class = RoleAssignmentSerializer
    permission_classes = [HasPermission]
    required_permission = "roles.view"
    write_permission = "roles.manage"

    def perform_create(self, serializer):
        serializer.save(assigned_by=self.request.user)


class RoleAssignmentDetail(generics.DestroyAPIView):
    queryset = RoleAssignment.objects.all()
    serializer_class = RoleAssignmentSerializer
    permission_classes = [HasPermission]
    required_permission = "roles.manage"


# ── Guardianships ─────────────────────────────────────────────────

class GuardianshipList(generics.ListCreateAPIView):
    queryset = Guardianship.objects.select_related(
        "guardian", "ward", "approved_by"
    ).all()
    serializer_class = GuardianshipSerializer
    permission_classes = [HasPermission]
    required_permission = "guardianships.view"
    write_permission = "guardianships.manage"


class GuardianshipDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Guardianship.objects.select_related(
        "guardian", "ward", "approved_by"
    ).all()
    serializer_class = GuardianshipSerializer
    permission_classes = [HasPermission]
    required_permission = "guardianships.view"
    write_permission = "guardianships.manage"


# ── Users ──────────────────────────────────────────────────────────

class UserList(generics.ListCreateAPIView):
    queryset = User.objects.prefetch_related("role_assignments__role").all()
    permission_classes = [HasPermission]
    required_permission = "users.view"
    write_permission = "users.manage"

    def get_serializer_class(self):
        if self.request.method == "POST":
            return UserCreateSerializer
        return UserSerializer


class UserDetail(generics.RetrieveUpdateAPIView):
    queryset = User.objects.prefetch_related("role_assignments__role").all()
    serializer_class = UserSerializer
    permission_classes = [HasPermission]
    required_permission = "users.view"
    write_permission = "users.manage"


# ── Profile ────────────────────────────────────────────────────────

@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def profile(request):
    user = request.user
    person = getattr(user, "person", None)

    if request.method == "GET":
        user_perms = sorted(get_user_permissions(user))
        data = ProfileSerializer({
            "user": user,
            "person": person,
            "permissions": user_perms,
        }).data
        return Response(data)

    if person and request.data:
        for field in ("first_name", "last_name", "email", "phone"):
            if field in request.data:
                setattr(person, field, request.data[field])
        person.save()

    user_perms = sorted(get_user_permissions(user))
    data = ProfileSerializer({
        "user": user,
        "person": person,
        "permissions": user_perms,
    }).data
    return Response(data)


# ── Data Export / Import ──────────────────────────────────────────

def _is_org_admin(user):
    """Check whether the user holds the Organisational Admin role."""
    return RoleAssignment.objects.filter(
        user=user,
        role__name="Organisational Admin",
        scope_type="global",
    ).exists()


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def data_export(request):
    if not _is_org_admin(request.user):
        return Response(
            {"detail": "Only Organisational Admins can export data."},
            status=status.HTTP_403_FORBIDDEN,
        )

    buf = io.StringIO()
    call_command("export_data", stdout=buf)
    yaml_content = buf.getvalue()

    response = HttpResponse(yaml_content, content_type="application/x-yaml")
    response["Content-Disposition"] = "attachment; filename=charmr_export.yaml"
    return response


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def data_import(request):
    if not _is_org_admin(request.user):
        return Response(
            {"detail": "Only Organisational Admins can import data."},
            status=status.HTTP_403_FORBIDDEN,
        )

    uploaded = request.FILES.get("file")
    if not uploaded:
        return Response(
            {"detail": "No file uploaded. Send a YAML file as 'file' in multipart form data."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        content = uploaded.read().decode("utf-8")
        data = yaml.safe_load(content)
    except Exception as e:
        return Response(
            {"detail": f"Invalid YAML file: {e}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not data or "charmr_export" not in data:
        return Response(
            {"detail": "Not a valid Charmr export file (missing charmr_export header)."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False)
    try:
        tmp.write(content)
        tmp.close()

        buf = io.StringIO()
        wipe = request.data.get("wipe", "false")
        cmd_args = [tmp.name]
        if wipe in ("true", "1", True):
            cmd_args.append("--wipe")

        call_command("populate_data", *cmd_args, stdout=buf, stderr=buf)
        output = buf.getvalue()
    except Exception as e:
        return Response(
            {"detail": f"Import failed: {e}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    finally:
        os.unlink(tmp.name)

    return Response({"detail": "Data imported successfully.", "log": output})
