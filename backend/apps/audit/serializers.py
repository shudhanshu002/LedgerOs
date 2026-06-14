from django.contrib.auth.models import User
from rest_framework import serializers

from apps.audit.models import AuditLog


class UserMiniSerializer(serializers.ModelSerializer):
    """
    Small safe user object for audit responses.
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


class AuditLogSerializer(serializers.ModelSerializer):
    """
    Serializer for audit timeline.

    This shows:
    - who performed the action
    - what action happened
    - which entity changed
    - before/after state
    - extra metadata
    """

    actor_detail = UserMiniSerializer(
        source="actor",
        read_only=True,
    )

    action_display = serializers.CharField(
        source="get_action_display",
        read_only=True,
    )

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "actor",
            "actor_detail",
            "action",
            "action_display",
            "entity_type",
            "entity_id",
            "before",
            "after",
            "note",
            "metadata",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "actor",
            "actor_detail",
            "action",
            "action_display",
            "entity_type",
            "entity_id",
            "before",
            "after",
            "note",
            "metadata",
            "created_at",
        ]