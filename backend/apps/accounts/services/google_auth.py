from django.conf import settings
from django.contrib.auth.models import User
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from rest_framework_simplejwt.tokens import RefreshToken


class GoogleAuthError(Exception):
    pass


def verify_google_token(raw_id_token: str) -> dict:
    """
    Verifies the Google ID token sent from frontend.

    Google only proves identity.
    Our backend still creates/returns its own JWT tokens.
    """

    if not settings.GOOGLE_CLIENT_ID:
        raise GoogleAuthError("GOOGLE_CLIENT_ID is not configured.")

    try:
        payload = id_token.verify_oauth2_token(
            raw_id_token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except ValueError as exc:
        raise GoogleAuthError("Invalid Google ID token.") from exc

    email = payload.get("email")
    email_verified = payload.get("email_verified")
    name = payload.get("name", "")
    given_name = payload.get("given_name", "")
    family_name = payload.get("family_name", "")

    if not email:
        raise GoogleAuthError("Google token did not include email.")

    if not email_verified:
        raise GoogleAuthError("Google email is not verified.")

    return {
        "email": email,
        "name": name,
        "given_name": given_name,
        "family_name": family_name,
    }


def get_or_create_google_user(google_user: dict) -> User:
    email = google_user["email"]
    username = email.split("@")[0]

    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            "username": username,
            "first_name": google_user.get("given_name", ""),
            "last_name": google_user.get("family_name", ""),
        },
    )

    if created:
        user.set_unusable_password()
        user.save(update_fields=["password"])

    return user


def issue_tokens_for_user(user: User) -> dict:
    refresh = RefreshToken.for_user(user)

    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


def login_with_google(raw_id_token: str) -> dict:
    google_user = verify_google_token(raw_id_token)
    user = get_or_create_google_user(google_user)
    tokens = issue_tokens_for_user(user)

    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
        },
        "access": tokens["access"],
        "refresh": tokens["refresh"],
    }