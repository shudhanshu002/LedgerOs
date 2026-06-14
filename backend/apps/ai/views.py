from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ai.services.anomaly_explainer import build_human_summary
from apps.imports.models import ImportBatch


class ImportAnomalyExplainView(APIView):
    """
    AI-style import anomaly explanation endpoint.

    Endpoint:
    GET /api/ai/imports/{batch_id}/explain/

    Important:
    This endpoint does not calculate money.
    It does not approve or reject rows.
    It only explains already-detected ImportIssue records in plain English.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, batch_id):
        try:
            batch = (
                ImportBatch.objects
                .filter(group__memberships__user=request.user)
                .select_related("group", "uploaded_by")
                .get(id=batch_id)
            )
        except ImportBatch.DoesNotExist as exc:
            raise ValidationError(
                "Import batch not found or you do not have access."
            ) from exc

        explanation = build_human_summary(batch)

        return Response(
            explanation,
            status=status.HTTP_200_OK,
        )