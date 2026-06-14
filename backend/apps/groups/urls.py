from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.groups.views import GroupMembershipViewSet, GroupViewSet


group_router = DefaultRouter()
group_router.register("", GroupViewSet, basename="groups")

membership_router = DefaultRouter()
membership_router.register("", GroupMembershipViewSet, basename="group-memberships")


urlpatterns = [
    path("memberships/", include(membership_router.urls)),
    path("", include(group_router.urls)),
]