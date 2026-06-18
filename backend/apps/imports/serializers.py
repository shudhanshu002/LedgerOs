from django.contrib.auth.models import User
from rest_framework import serializers

from apps.imports.models import (
    ImportBatch,
    ImportDecision,
    ImportIssue,
    ImportRow,
)
from apps.imports.filename_display import humanize_filename


class UserMiniSerializer(serializers.ModelSerializer):
    """
    Small user object for import report responses.
    """

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
        ]


class ImportIssueSerializer(serializers.ModelSerializer):
    """
    One detected CSV problem.

    Example:
    - INVALID_DATE
    - USD_CONVERTED
    - DUPLICATE_EXACT
    - INACTIVE_MEMBER
    """

    reviewed_by_detail = UserMiniSerializer(
        source="reviewed_by",
        read_only=True,
    )
    row_number = serializers.SerializerMethodField()
    row_status = serializers.SerializerMethodField()

    class Meta:
        model = ImportIssue
        fields = [
            "id",
            "batch",
            "row",
            "row_number",
            "row_status",
            "code",
            "severity",
            "message",
            "policy",
            "suggested_action",
            "status",
            "reviewed_by",
            "reviewed_by_detail",
            "reviewed_at",
            "resolution_note",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "batch",
            "row",
            "code",
            "severity",
            "message",
            "policy",
            "suggested_action",
            "reviewed_by",
            "reviewed_at",
            "created_at",
            "updated_at",
        ]

    def get_row_number(self, obj):
        return obj.row.row_number if obj.row else None

    def get_row_status(self, obj):
        return obj.row.status if obj.row else None


class ImportDecisionSerializer(serializers.ModelSerializer):
    """
    Stores user approval/rejection decisions.

    Keeps the reviewer trail visible:
    "I want to approve anything the app deletes or changes."
    """

    decided_by_detail = UserMiniSerializer(
        source="decided_by",
        read_only=True,
    )

    class Meta:
        model = ImportDecision
        fields = [
            "id",
            "issue",
            "decided_by",
            "decided_by_detail",
            "decision",
            "before",
            "after",
            "note",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "decided_by",
            "before",
            "after",
            "created_at",
            "updated_at",
        ]


class ImportRowSerializer(serializers.ModelSerializer):
    """
    One CSV row.

    Shows both raw and normalized data for traceability.
    """

    issues = ImportIssueSerializer(many=True, read_only=True)

    class Meta:
        model = ImportRow
        fields = [
            "id",
            "batch",
            "row_number",
            "raw_data",
            "normalized_data",
            "row_hash",
            "status",
            "issues",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "batch",
            "row_number",
            "raw_data",
            "normalized_data",
            "row_hash",
            "created_at",
            "updated_at",
        ]


class ImportBatchSerializer(serializers.ModelSerializer):
    """
    Main import report response.

    Includes:
    - uploaded file info
    - status
    - summary
    - rows
    """

    uploaded_by_detail = UserMiniSerializer(
        source="uploaded_by",
        read_only=True,
    )

    rows = ImportRowSerializer(
        many=True,
        read_only=True,
    )

    issue_count = serializers.SerializerMethodField()
    display_filename = serializers.SerializerMethodField()

    class Meta:
        model = ImportBatch
        fields = [
            "id",
            "group",
            "uploaded_by",
            "uploaded_by_detail",
            "original_filename",
            "display_filename",
            "status",
            "total_rows",
            "summary",
            "issue_count",
            "rows",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "uploaded_by",
            "original_filename",
            "display_filename",
            "status",
            "total_rows",
            "summary",
            "created_at",
            "updated_at",
        ]

    def get_issue_count(self, obj):
        return obj.issues.count()

    def get_display_filename(self, obj):
        return humanize_filename(obj.original_filename)


class ImportBatchListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing import batches.

    We do not include every row here to keep list API fast.
    """

    uploaded_by_detail = UserMiniSerializer(
        source="uploaded_by",
        read_only=True,
    )

    issue_count = serializers.SerializerMethodField()
    display_filename = serializers.SerializerMethodField()

    class Meta:
        model = ImportBatch
        fields = [
            "id",
            "group",
            "uploaded_by_detail",
            "original_filename",
            "display_filename",
            "status",
            "total_rows",
            "summary",
            "issue_count",
            "created_at",
        ]

    def get_issue_count(self, obj):
        return obj.issues.count()

    def get_display_filename(self, obj):
        return humanize_filename(obj.original_filename)


class ImportUploadSerializer(serializers.Serializer):
    """
    Input serializer for CSV upload.
    """

    group_id = serializers.IntegerField()
    file = serializers.FileField()

    def validate_file(self, file):
        filename = file.name.lower()

        if not filename.endswith(".csv"):
            raise serializers.ValidationError(
                "Only CSV files are allowed."
            )

        # Basic safety limit: 5 MB.
        if file.size > 5 * 1024 * 1024:
            raise serializers.ValidationError(
                "CSV file is too large. Maximum allowed size is 5 MB."
            )

        return file


class ImportIssueDecisionSerializer(serializers.Serializer):
    """
    Input serializer for reviewing one import issue.

    Example body:

    {
      "decision": "APPROVE",
      "note": "Approved USD conversion using fixed rate."
    }
    """

    decision = serializers.ChoiceField(
        choices=[
            "APPROVE",
            "REJECT",
            "SKIP_ROW",
            "KEEP_ROW",
            "IMPORT_AS_SETTLEMENT",
            "FIX_LATER",
        ]
    )

    note = serializers.CharField(
        required=False,
        allow_blank=True,
    )
