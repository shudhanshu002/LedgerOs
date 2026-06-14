from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.groups.models import Group, GroupMembership
from apps.groups.serializers import (
    CreateGroupSerializer,
    GroupMembershipSerializer,
    GroupSerializer,
)


def user_is_group_admin(group: Group, user: User) -> bool:
    """
    Returns True if the user is an ADMIN member of the group.

    This is used for actions that change group structure:
    - adding members
    - editing membership dates
    - removing members
    """

    return GroupMembership.objects.filter(
        group=group,
        user=user,
        role=GroupMembership.Role.ADMIN,
        left_at__isnull=True,
    ).exists()


class GroupViewSet(viewsets.ModelViewSet):
    """
    Group API.

    Supports:
    - list groups current user belongs to
    - create group
    - read group detail with membership timeline
    - update group metadata
    - add members
    """

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Group.objects
            .filter(memberships__user=self.request.user)
            .distinct()
            .prefetch_related("memberships__user")
            .select_related("created_by")
            .order_by("-created_at")
        )

    def get_serializer_class(self):
        if self.action == "create":
            return CreateGroupSerializer

        return GroupSerializer

    @transaction.atomic
    def perform_create(self, serializer):
        """
        When a user creates a group, they automatically become ADMIN.

        This prevents a group from existing without any admin.
        """

        group = serializer.save(created_by=self.request.user)

        GroupMembership.objects.create(
            group=group,
            user=self.request.user,
            role=GroupMembership.Role.ADMIN,
            joined_at=timezone.localdate(),
        )

    def perform_update(self, serializer):
        group = self.get_object()

        if not user_is_group_admin(group, self.request.user):
            raise PermissionDenied("Only group admins can update this group.")

        serializer.save()

    def perform_destroy(self, instance):
        if not user_is_group_admin(instance, self.request.user):
            raise PermissionDenied("Only group admins can delete this group.")

        instance.delete()

    @action(detail=True, methods=["post"], url_path="members")
    def add_member(self, request, pk=None):
        """
        Add a member to a group with a join date.

        Request body example:

        {
          "user": 6,
          "role": "MEMBER",
          "joined_at": "2024-04-15",
          "left_at": null
        }

        This is important because Sam joined mid-April.
        """

        group = self.get_object()

        if not user_is_group_admin(group, request.user):
            raise PermissionDenied("Only group admins can add members.")

        serializer = GroupMembershipSerializer(
            data={
                **request.data,
                "group": group.id,
            }
        )

        serializer.is_valid(raise_exception=True)
        membership = serializer.save()

        return Response(
            GroupMembershipSerializer(membership).data,
            status=status.HTTP_201_CREATED,
        )


class GroupMembershipViewSet(viewsets.ModelViewSet):
    """
    Membership API.

    Used to update join/leave dates.

    Example:
    - Meera left on 2024-03-31
    - Sam joined on 2024-04-15
    """

    serializer_class = GroupMembershipSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            GroupMembership.objects
            .filter(group__memberships__user=self.request.user)
            .select_related("group", "user")
            .order_by("group_id", "joined_at")
            .distinct()
        )

    def perform_update(self, serializer):
        membership = self.get_object()

        if not user_is_group_admin(membership.group, self.request.user):
            raise PermissionDenied("Only group admins can update memberships.")

        serializer.save()

    def perform_destroy(self, instance):
        if not user_is_group_admin(instance.group, self.request.user):
            raise PermissionDenied("Only group admins can remove memberships.")

        instance.delete()
