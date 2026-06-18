from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


urlpatterns = [
    # Admin.
    path("admin/", admin.site.urls),

    # Token auth.
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # App APIs.
    path("api/auth/", include("apps.accounts.urls")),
    path("api/groups/", include("apps.groups.urls")),
    path("api/expenses/", include("apps.expenses.urls")),
    path("api/imports/", include("apps.imports.urls")),
    path("api/audit/", include("apps.audit.urls")),
    path("api/ai/", include("apps.ai.urls")),
]
