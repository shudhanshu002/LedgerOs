from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.expenses.views import ExpenseViewSet, SettlementViewSet


expense_router = DefaultRouter()
expense_router.register("", ExpenseViewSet, basename="expenses")

settlement_router = DefaultRouter()
settlement_router.register("", SettlementViewSet, basename="settlements")


urlpatterns = [
    path("settlements/", include(settlement_router.urls)),
    path("", include(expense_router.urls)),
]