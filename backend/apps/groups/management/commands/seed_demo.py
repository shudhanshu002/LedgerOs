from datetime import date

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.groups.models import Group, GroupMembership


DEMO_PASSWORD = "Password@123"


class Command(BaseCommand):
    help = "Seed demo users, group, and membership timeline for CSV import testing."

    @transaction.atomic
    def handle(self, *args, **options):
        users = self.create_demo_users()
        group = self.create_demo_group(users["Aisha"])
        self.create_memberships(group, users)

        self.stdout.write(
            self.style.SUCCESS("Demo data seeded successfully.")
        )

        self.stdout.write("")
        self.stdout.write("Demo login users:")
        self.stdout.write("--------------------------------")
        for username in users.keys():
            self.stdout.write(f"{username} / {DEMO_PASSWORD}")

        self.stdout.write("")
        self.stdout.write(f"Group created: {group.name}")
        self.stdout.write("")
        self.stdout.write("Membership timeline:")
        self.stdout.write("--------------------------------")
        self.stdout.write("Aisha  joined 2026-02-01, active, group admin")
        self.stdout.write("Rohan  joined 2026-02-01, active")
        self.stdout.write("Priya  joined 2026-02-01, active")
        self.stdout.write("Meera  joined 2026-02-01, left 2026-03-29")
        self.stdout.write("Dev    joined 2026-02-08, left 2026-03-14")
        self.stdout.write("Sam    joined 2026-04-08, active")

    def create_demo_users(self) -> dict[str, User]:
        """
        Creates demo users used by the real CSV.

        Important:
        Usernames are intentionally simple because importer maps CSV names
        to username case-insensitively.
        """

        demo_users = {}

        for username in ["Aisha", "Rohan", "Priya", "Meera", "Dev", "Sam"]:
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": f"{username.lower()}@example.com",
                    "first_name": username,
                },
            )

            user.email = f"{username.lower()}@example.com"
            user.first_name = username
            user.set_password(DEMO_PASSWORD)
            user.save()

            demo_users[username] = user

            if created:
                self.stdout.write(f"Created user: {username}")
            else:
                self.stdout.write(f"Updated user: {username}")

        return demo_users

    def create_demo_group(self, created_by: User) -> Group:
        """
        Creates one group for the assignment demo.
        """

        group, created = Group.objects.get_or_create(
            name="Goa Trip 2026",
            defaults={
                "description": "Demo group for Splitwise-style CSV import assignment.",
                "created_by": created_by,
            },
        )

        group.description = "Demo group for Splitwise-style CSV import assignment."
        group.created_by = created_by
        group.save()

        if created:
            self.stdout.write("Created group: Goa Trip 2026")
        else:
            self.stdout.write("Updated group: Goa Trip 2026")

        return group

    def upsert_membership(
        self,
        *,
        group: Group,
        user: User,
        role: str,
        joined_at: date,
        left_at: date | None = None,
    ):
        """
        Creates or updates membership timeline.

        The timeline is important because importer must detect:
        - Meera expenses after leaving
        - Sam expenses before joining
        """

        membership, created = GroupMembership.objects.get_or_create(
            group=group,
            user=user,
            joined_at=joined_at,
            defaults={
                "role": role,
                "left_at": left_at,
            },
        )

        membership.role = role
        membership.left_at = left_at
        membership.save()

        action = "Created" if created else "Updated"

        left_text = left_at.isoformat() if left_at else "active"

        self.stdout.write(
            f"{action} membership: {user.username} | {role} | "
            f"{joined_at.isoformat()} -> {left_text}"
        )

    def create_memberships(self, group: Group, users: dict[str, User]):
        """
        Creates the demo membership timeline.

        Dates are aligned with the real CSV import anomaly requirements.
        """

        self.upsert_membership(
            group=group,
            user=users["Aisha"],
            role=GroupMembership.Role.ADMIN,
            joined_at=date(2026, 2, 1),
        )

        self.upsert_membership(
            group=group,
            user=users["Rohan"],
            role=GroupMembership.Role.MEMBER,
            joined_at=date(2026, 2, 1),
        )

        self.upsert_membership(
            group=group,
            user=users["Priya"],
            role=GroupMembership.Role.MEMBER,
            joined_at=date(2026, 2, 1),
        )

        self.upsert_membership(
            group=group,
            user=users["Meera"],
            role=GroupMembership.Role.MEMBER,
            joined_at=date(2026, 2, 1),
            left_at=date(2026, 3, 29),
        )

        self.upsert_membership(
            group=group,
            user=users["Dev"],
            role=GroupMembership.Role.MEMBER,
            joined_at=date(2026, 2, 8),
            left_at=date(2026, 3, 14),
        )

        self.upsert_membership(
            group=group,
            user=users["Sam"],
            role=GroupMembership.Role.MEMBER,
            joined_at=date(2026, 4, 8),
        )
