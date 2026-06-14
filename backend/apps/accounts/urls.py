from django.urls import path

from apps.accounts.views import GoogleLoginView, MeView, UserListView


urlpatterns = [
    path("me/", MeView.as_view(), name="me"),
    path("users/", UserListView.as_view(), name="users"),
    path("google/", GoogleLoginView.as_view(), name="google-login"),
]
