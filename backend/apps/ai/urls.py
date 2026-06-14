from django.urls import path

from apps.ai.views import ImportAnomalyExplainView


urlpatterns = [
    path(
        "imports/<int:batch_id>/explain/",
        ImportAnomalyExplainView.as_view(),
        name="import-anomaly-explain",
    ),
]