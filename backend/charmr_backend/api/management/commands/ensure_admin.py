from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

User = get_user_model()

ADMIN_USERNAME = "admin"
ADMIN_EMAIL = "admin@charmr.local"


class Command(BaseCommand):
    help = "Create or update the admin superuser with the given password."

    def add_arguments(self, parser):
        parser.add_argument(
            "--password",
            required=True,
            help="Password to set for the admin user.",
        )

    def handle(self, *args, **options):
        password = options["password"]
        user, created = User.objects.get_or_create(
            username=ADMIN_USERNAME,
            defaults={
                "email": ADMIN_EMAIL,
                "is_staff": True,
                "is_superuser": True,
            },
        )

        if not created:
            user.is_staff = True
            user.is_superuser = True

        user.set_password(password)
        user.save()

        action = "Created" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(f"{action} admin user '{ADMIN_USERNAME}'."))
