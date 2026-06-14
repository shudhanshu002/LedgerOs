from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.imports.views import ImportBatchViewSet, ImportIssueViewSet


batch_router = DefaultRouter()
batch_router.register("", ImportBatchViewSet, basename="imports")

issue_router = DefaultRouter()
issue_router.register("", ImportIssueViewSet, basename="import-issues")


urlpatterns = [
    path("issues/", include(issue_router.urls)),
    path("", include(batch_router.urls)),
]