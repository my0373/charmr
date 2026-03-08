from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health, name="health"),
    path("auth/login/", views.auth_login, name="auth-login"),
    path("auth/logout/", views.auth_logout, name="auth-logout"),
    path("auth/me/", views.auth_me, name="auth-me"),
    path("auth/csrf/", views.csrf_token, name="csrf-token"),

    path("regions/", views.RegionList.as_view(), name="region-list"),
    path("regions/<int:pk>/", views.RegionDetail.as_view(), name="region-detail"),

    path("families/", views.FamilyList.as_view(), name="family-list"),
    path("families/<int:pk>/", views.FamilyDetail.as_view(), name="family-detail"),

    path("people/", views.PersonList.as_view(), name="person-list"),
    path("people/<int:pk>/", views.PersonDetail.as_view(), name="person-detail"),

    path("roles/", views.RoleList.as_view(), name="role-list"),
    path("roles/<int:pk>/", views.RoleDetail.as_view(), name="role-detail"),

    path("permissions/", views.PermissionList.as_view(), name="permission-list"),

    path("role-assignments/", views.RoleAssignmentList.as_view(), name="role-assignment-list"),
    path("role-assignments/<int:pk>/", views.RoleAssignmentDetail.as_view(), name="role-assignment-detail"),

    path("guardianships/", views.GuardianshipList.as_view(), name="guardianship-list"),
    path("guardianships/<int:pk>/", views.GuardianshipDetail.as_view(), name="guardianship-detail"),

    path("users/", views.UserList.as_view(), name="user-list"),
    path("users/<int:pk>/", views.UserDetail.as_view(), name="user-detail"),

    path("profile/", views.profile, name="profile"),

    path("data/export/", views.data_export, name="data-export"),
    path("data/import/", views.data_import, name="data-import"),
]
