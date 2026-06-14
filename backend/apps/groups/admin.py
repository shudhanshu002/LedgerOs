from django.contrib import admin

from apps.groups.models import Group, GroupMembership


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    """
    Admin view for groups.
    """

    list_display = [
        "id",
        "name",
        "created_by",
        "created_at",
        "updated_at",
    ]

    search_fields = [
        "name",
        "description",
        "created_by__username",
        "created_by__email",
    ]

    list_filter = [
        "created_at",
        "updated_at",
    ]

    readonly_fields = [
        "created_at",
        "updated_at",
    ]


@admin.register(GroupMembership)
class GroupMembershipAdmin(admin.ModelAdmin):
    """
    Admin view for membership timeline.

    This is useful for checking:
    - Sam joined mid-April
    - Meera left end of March
    """

    list_display = [
        "id",
        "group",
        "user",
        "role",
        "joined_at",
        "left_at",
        "created_at",
    ]

    search_fields = [
        "group__name",
        "user__username",
        "user__email",
    ]

    list_filter = [
        "role",
        "joined_at",
        "left_at",
    ]

    readonly_fields = [
        "created_at",
        "updated_at",
    ]