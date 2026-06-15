from django.contrib.auth.models import User
from rest_framework import serializers

from apps.groups.models import Group, GroupMembership


class UserMiniSerializer(serializers.ModelSerializer):
    """
    Small user representation used inside group/member responses.
    We do not expose password or sensitive auth fields.
    """

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
        ]


class GroupMembershipSerializer(serializers.ModelSerializer):
    """
    Shows a member's timeline in the group.

    Example:
    Sam joined on 2024-04-15, so expenses before that date should not include him.
    """

    user_detail = UserMiniSerializer(source="user", read_only=True)

    class Meta:
        model = GroupMembership
        fields = [
            "id",
            "group",
            "user",
            "user_detail",
            "role",
            "joined_at",
            "left_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        joined_at = attrs.get("joined_at")
        left_at = attrs.get("left_at")

        if self.instance:
            joined_at = joined_at or self.instance.joined_at
            left_at = left_at if "left_at" in attrs else self.instance.left_at

        if left_at and joined_at and left_at < joined_at:
            raise serializers.ValidationError(
                {
                    "left_at": "left_at cannot be before joined_at."
                }
            )

        return attrs


class GroupSerializer(serializers.ModelSerializer):
    """
    Main group serializer.

    It includes memberships so the frontend can show who was active
    during which period.
    """

    memberships = GroupMembershipSerializer(many=True, read_only=True)
    created_by_detail = UserMiniSerializer(source="created_by", read_only=True)

    class Meta:
        model = Group
        fields = [
            "id",
            "name",
            "description",
            "created_by",
            "created_by_detail",
            "memberships",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_by",
            "created_at",
            "updated_at",
        ]


class CreateGroupSerializer(serializers.ModelSerializer):
    """
    Separate serializer for creating groups.

    Reason:
    Group creation does not need nested memberships.
    The creator automatically becomes ADMIN in the view.
    """

    class Meta:
        model = Group
        fields = [
            "id",
            "name",
            "description",
        ]

    def validate_name(self, value):
        value = value.strip()

        if len(value) < 3:
            raise serializers.ValidationError(
                "Group name must be at least 3 characters."
            )

        return value
