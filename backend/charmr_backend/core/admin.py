from django.contrib import admin

from .models import (
    Family,
    Guardianship,
    Permission,
    Person,
    Region,
    Role,
    RoleAssignment,
)

admin.site.register(Region)
admin.site.register(Family)
admin.site.register(Person)
admin.site.register(Permission)
admin.site.register(Role)
admin.site.register(RoleAssignment)
admin.site.register(Guardianship)
