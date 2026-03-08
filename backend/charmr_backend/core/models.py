from datetime import date

from django.conf import settings
from django.contrib.auth.models import Group
from django.db import models


class Region(models.Model):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=10, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Family(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        LAPSED = "lapsed", "Lapsed"
        PENDING = "pending", "Pending"

    name = models.CharField(max_length=200)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "families"

    def __str__(self):
        return self.name


class Person(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField(null=True, blank=True)
    email = models.EmailField(blank=True, default="")
    phone = models.CharField(max_length=30, blank=True, default="")
    family = models.ForeignKey(Family, on_delete=models.CASCADE, related_name="members")
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="person",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["last_name", "first_name"]

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def is_minor(self):
        if not self.date_of_birth:
            return False
        today = date.today()
        age = today.year - self.date_of_birth.year
        if (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day):
            age -= 1
        return age < 18

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


class Permission(models.Model):
    codename = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=50)

    class Meta:
        ordering = ["category", "codename"]

    def __str__(self):
        return f"{self.category}: {self.name}"


class Role(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default="")
    is_system_role = models.BooleanField(default=False)
    permissions = models.ManyToManyField(Permission, blank=True, related_name="roles")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class RoleAssignment(models.Model):
    class ScopeType(models.TextChoices):
        GLOBAL = "global", "Global"
        REGION = "region", "Region"
        FAMILY = "family", "Family"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="role_assignments",
    )
    group = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="role_assignments",
    )
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="assignments")
    scope_type = models.CharField(
        max_length=20, choices=ScopeType.choices, default=ScopeType.GLOBAL
    )
    scope_id = models.PositiveIntegerField(null=True, blank=True)
    assigned_at = models.DateTimeField(auto_now_add=True)
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assignments_made",
    )

    class Meta:
        ordering = ["-assigned_at"]

    def __str__(self):
        target = self.user or self.group
        return f"{target} -> {self.role} ({self.scope_type})"

    @property
    def scope_object(self):
        if self.scope_type == self.ScopeType.REGION and self.scope_id:
            return Region.objects.filter(pk=self.scope_id).first()
        if self.scope_type == self.ScopeType.FAMILY and self.scope_id:
            return Family.objects.filter(pk=self.scope_id).first()
        return None

    @property
    def scope_display(self):
        if self.scope_type == self.ScopeType.GLOBAL:
            return "Global"
        obj = self.scope_object
        return str(obj) if obj else f"{self.scope_type} #{self.scope_id}"


class Guardianship(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        PENDING = "pending", "Pending"
        REVOKED = "revoked", "Revoked"

    guardian = models.ForeignKey(
        Person, on_delete=models.CASCADE, related_name="wards"
    )
    ward = models.ForeignKey(
        Person, on_delete=models.CASCADE, related_name="guardians"
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="guardianships_approved",
    )

    class Meta:
        ordering = ["-created_at"]
        unique_together = [("guardian", "ward")]

    def __str__(self):
        return f"{self.guardian} -> {self.ward} ({self.status})"
