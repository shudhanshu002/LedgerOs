from django.urls import path

from apps.accounts.views import GoogleLoginView, MeView


urlpatterns = [
    path("me/", MeView.as_view(), name="me"),
    path("google/", GoogleLoginView.as_view(), name="google-login"),
]