from django.contrib.auth.models import User
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.services.google_auth import GoogleAuthError, login_with_google


class MeView(APIView):
    """
    Returns the currently logged-in user.

    Used by frontend to restore auth state after page refresh.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        return Response(
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
            }
        )


class UserListView(APIView):
    """
    Returns users that can be added to groups or selected in expense forms.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        users = User.objects.order_by("username")

        return Response(
            [
                {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                }
                for user in users
            ]
        )


class GoogleLoginSerializer(serializers.Serializer):
    id_token = serializers.CharField(required=True)


class GoogleLoginView(APIView):
    """
    Accepts Google ID token from frontend.
    Verifies it.
    Creates/fetches local Django user.
    Returns our own JWT access and refresh tokens.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = GoogleLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        raw_id_token = serializer.validated_data["id_token"]

        try:
            result = login_with_google(raw_id_token)
        except GoogleAuthError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(result, status=status.HTTP_200_OK)
