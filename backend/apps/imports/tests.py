from datetime import date

from django.conf import settings
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from apps.expenses.models import Expense
from apps.groups.models import Group, GroupMembership
from apps.imports.models import ImportIssue
from apps.imports.services.commit_import import commit_import_batch
from apps.imports.services.parser import create_import_batch_from_csv
from apps.imports.views import apply_import_decision


DEMO_PASSWORD = "Password@123"


class AssignmentCsvImportTests(TestCase):
    def setUp(self):
        self.users = {}

        for username in ["Aisha", "Rohan", "Priya", "Meera", "Dev", "Sam"]:
            self.users[username] = User.objects.create_user(
                username=username,
                email=f"{username.lower()}@example.com",
                password=DEMO_PASSWORD,
            )

        self.group = Group.objects.create(
            name="Goa Trip 2026",
            description="Assignment group",
            created_by=self.users["Aisha"],
        )

        self.add_membership("Aisha", GroupMembership.Role.ADMIN, date(2026, 2, 1))
        self.add_membership("Rohan", GroupMembership.Role.MEMBER, date(2026, 2, 1))
        self.add_membership("Priya", GroupMembership.Role.MEMBER, date(2026, 2, 1))
        self.add_membership(
            "Meera",
            GroupMembership.Role.MEMBER,
            date(2026, 2, 1),
            date(2026, 3, 29),
        )
        self.add_membership(
            "Dev",
            GroupMembership.Role.MEMBER,
            date(2026, 2, 8),
            date(2026, 3, 14),
        )
        self.add_membership("Sam", GroupMembership.Role.MEMBER, date(2026, 4, 8))

    def add_membership(self, username, role, joined_at, left_at=None):
        GroupMembership.objects.create(
            group=self.group,
            user=self.users[username],
            role=role,
            joined_at=joined_at,
            left_at=left_at,
        )

    def import_assignment_csv(self):
        csv_path = settings.BASE_DIR / "expenses_export.csv"

        with csv_path.open("rb") as file_obj:
            return create_import_batch_from_csv(
                group=self.group,
                uploaded_by=self.users["Aisha"],
                file_obj=file_obj,
            )

    def test_assignment_csv_generates_reviewable_import_report(self):
        batch = self.import_assignment_csv()

        self.assertEqual(batch.total_rows, 42)
        self.assertEqual(batch.summary["issues"]["error"], 9)
        self.assertEqual(batch.summary["issues"]["warning"], 19)
        self.assertEqual(batch.summary["issues"]["info"], 4)

        issue_codes = batch.summary["issue_codes"]

        for expected_code in [
            "USD_CONVERTED",
            "INACTIVE_MEMBER",
            "SETTLEMENT_AS_EXPENSE",
            "MISSING_PAYER",
            "MISSING_CURRENCY",
            "ZERO_AMOUNT",
            "INVALID_DATE",
            "DUPLICATE_CONFLICT",
            "POSSIBLE_DUPLICATE",
            "NEGATIVE_AMOUNT",
        ]:
            self.assertIn(expected_code, issue_codes)

    def test_approved_inactive_member_issue_can_commit_reviewed_row(self):
        csv_text = (
            "date,description,paid_by,amount,currency,split_type,"
            "split_with,split_details,notes\n"
            "2026-04-01,Late visitor dinner,Dev,3200,INR,equal,"
            "\"Aisha;Rohan;Priya;Dev\",,Dev was not active by April\n"
        )

        batch = create_import_batch_from_csv(
            group=self.group,
            uploaded_by=self.users["Aisha"],
            file_obj=CsvBytes(csv_text, "inactive_member.csv"),
        )

        row = batch.rows.get(row_number=2)

        self.assertTrue(
            row.issues.filter(code="INACTIVE_MEMBER", status=ImportIssue.Status.OPEN)
            .exists()
        )

        result_before_review = commit_import_batch(batch, self.users["Aisha"])

        self.assertEqual(result_before_review["committed_expenses"], 0)
        self.assertEqual(Expense.objects.count(), 0)

        row.issues.filter(code="INACTIVE_MEMBER").update(
            status=ImportIssue.Status.APPROVED,
            reviewed_by=self.users["Aisha"],
        )
        row.status = row.Status.VALID
        row.save(update_fields=["status", "updated_at"])

        result_after_review = commit_import_batch(batch, self.users["Aisha"])

        self.assertEqual(result_after_review["committed_expenses"], 1)
        self.assertEqual(Expense.objects.count(), 1)

    def test_skip_row_closes_all_open_issues_for_that_row(self):
        batch = self.import_assignment_csv()

        row = next(
            row
            for row in batch.rows.prefetch_related("issues").all()
            if row.issues.filter(status=ImportIssue.Status.OPEN).count() > 1
        )
        open_issue_count = row.issues.filter(status=ImportIssue.Status.OPEN).count()
        issue = row.issues.filter(status=ImportIssue.Status.OPEN).first()

        apply_import_decision(
            issue=issue,
            decision="SKIP_ROW",
            reviewer=self.users["Aisha"],
            note="Skipped from review queue",
        )

        row.refresh_from_db()

        self.assertEqual(row.status, row.Status.SKIPPED)
        self.assertEqual(
            row.issues.filter(status=ImportIssue.Status.RESOLVED).count(),
            open_issue_count,
        )
        self.assertFalse(row.issues.filter(status=ImportIssue.Status.OPEN).exists())

    def test_issue_decision_endpoint_approves_issue(self):
        batch = self.import_assignment_csv()
        issue = batch.issues.filter(code="USD_CONVERTED").first()
        client = APIClient()
        client.force_authenticate(user=self.users["Aisha"])

        response = client.post(
            f"/api/imports/issues/{issue.id}/decision/",
            {
                "decision": "APPROVE",
                "note": "Approved converted USD amount",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        issue.refresh_from_db()

        self.assertEqual(issue.status, ImportIssue.Status.APPROVED)
        self.assertEqual(issue.reviewed_by, self.users["Aisha"])


class CsvBytes:
    def __init__(self, text: str, name: str):
        self.content = text.encode("utf-8")
        self.name = name

    def read(self):
        return self.content
