from django.conf import settings
from django.db import models
from django.utils import timezone


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Group(TimeStampedModel):
    """
    A shared expense group.

    Example:
    Flatmates Shared Expenses
    """

    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_expense_groups",
    )

    def __str__(self):
        return self.name


class GroupMembership(TimeStampedModel):
    """
    Historical membership record.

    This is one of the most important models in the assignment.

    It allows us to answer:
    - Was Sam active in March? No.
    - Was Meera active after March? No.
    """

    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Admin"
        MEMBER = "MEMBER", "Member"

    group = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        related_name="memberships",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="group_memberships",
    )

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.MEMBER,
    )

    joined_at = models.DateField()
    left_at = models.DateField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["group", "user", "joined_at"],
                name="unique_group_user_membership_period",
            )
        ]

    def __str__(self):
        return f"{self.user.username} in {self.group.name}"

    def is_active_on(self, expense_date):
        """
        Returns True if the member should be considered part of the group
        on the given expense date.
        """

        if expense_date < self.joined_at:
            return False

        if self.left_at and expense_date > self.left_at:
            return False

        return True