from django.contrib.auth.models import Group, User
from rest_framework import serializers

from core.models import (
    Family,
    Guardianship,
    Permission,
    Person,
    Region,
    Role,
    RoleAssignment,
)


class RegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = ["id", "name", "code", "created_at"]
        read_only_fields = ["id", "created_at"]


class FamilySerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Family
        fields = ["id", "name", "status", "created_at", "updated_at", "member_count"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_member_count(self, obj):
        return obj.members.count()


class PersonSerializer(serializers.ModelSerializer):
    family_name = serializers.CharField(source="family.name", read_only=True)
    is_minor = serializers.BooleanField(read_only=True)
    full_name = serializers.CharField(read_only=True)
    username = serializers.CharField(source="user.username", read_only=True, default=None)

    class Meta:
        model = Person
        fields = [
            "id", "first_name", "last_name", "full_name", "date_of_birth",
            "email", "phone", "family", "family_name", "user",
            "username", "is_minor", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ["id", "codename", "name", "category"]
        read_only_fields = ["id", "codename", "name", "category"]


class RoleSerializer(serializers.ModelSerializer):
    permissions = PermissionSerializer(many=True, read_only=True)
    permission_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Permission.objects.all(),
        source="permissions", write_only=True, required=False,
    )
    assignment_count = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = [
            "id", "name", "description", "is_system_role",
            "permissions", "permission_ids", "assignment_count", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_assignment_count(self, obj):
        return obj.assignments.count()


class RoleAssignmentSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source="role.name", read_only=True)
    scope_display = serializers.CharField(read_only=True)
    user_display = serializers.SerializerMethodField()
    group_display = serializers.SerializerMethodField()

    class Meta:
        model = RoleAssignment
        fields = [
            "id", "user", "group", "role", "role_name",
            "scope_type", "scope_id", "scope_display",
            "user_display", "group_display",
            "assigned_at", "assigned_by",
        ]
        read_only_fields = ["id", "assigned_at", "assigned_by"]

    def get_user_display(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return None

    def get_group_display(self, obj):
        if obj.group:
            return obj.group.name
        return None

    def validate(self, data):
        if not data.get("user") and not data.get("group"):
            raise serializers.ValidationError("Either user or group must be set.")
        if data.get("user") and data.get("group"):
            raise serializers.ValidationError("Set user or group, not both.")
        return data


class GuardianshipSerializer(serializers.ModelSerializer):
    guardian_name = serializers.CharField(source="guardian.full_name", read_only=True)
    ward_name = serializers.CharField(source="ward.full_name", read_only=True)
    ward_is_minor = serializers.BooleanField(source="ward.is_minor", read_only=True)
    approved_by_username = serializers.CharField(
        source="approved_by.username", read_only=True, default=None
    )

    class Meta:
        model = Guardianship
        fields = [
            "id", "guardian", "guardian_name", "ward", "ward_name",
            "ward_is_minor", "status", "created_at",
            "approved_by", "approved_by_username",
        ]
        read_only_fields = ["id", "created_at"]


class UserSerializer(serializers.ModelSerializer):
    person = PersonSerializer(read_only=True)
    role_assignments = RoleAssignmentSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "is_active", "is_staff", "date_joined", "last_login",
            "person", "role_assignments",
        ]
        read_only_fields = ["id", "date_joined", "last_login"]


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "password", "is_active", "is_staff"]
        read_only_fields = ["id"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class ProfileSerializer(serializers.Serializer):
    user = UserSerializer(read_only=True)
    person = PersonSerializer(read_only=True)
    permissions = serializers.ListField(child=serializers.CharField(), read_only=True)
