from django.test import SimpleTestCase

from apps.expenses.services.split_calculator import (
    SplitCalculationError,
    calculate_split,
    parse_named_values,
)


class SplitCalculatorTests(SimpleTestCase):
    """
    Tests for all supported split types.

    These tests are important because split calculation directly affects balances.
    """

    def test_equal_split_without_remainder(self):
        result = calculate_split(
            total_paise=10000,
            split_type="EQUAL",
            participants=["Aisha", "Rohan"],
        )

        self.assertEqual(
            result,
            {
                "Aisha": 5000,
                "Rohan": 5000,
            },
        )

    def test_equal_split_with_remainder(self):
        result = calculate_split(
            total_paise=100,
            split_type="EQUAL",
            participants=["Aisha", "Rohan", "Priya"],
        )

        self.assertEqual(
            result,
            {
                "Aisha": 34,
                "Rohan": 33,
                "Priya": 33,
            },
        )

    def test_exact_split_success(self):
        result = calculate_split(
            total_paise=120000,
            split_type="EXACT",
            participants=[],
            split_values_raw="Aisha:500,Rohan:700",
        )

        self.assertEqual(
            result,
            {
                "Aisha": 50000,
                "Rohan": 70000,
            },
        )

    def test_exact_split_fails_when_total_does_not_match(self):
        with self.assertRaises(SplitCalculationError):
            calculate_split(
                total_paise=120000,
                split_type="EXACT",
                participants=[],
                split_values_raw="Aisha:500,Rohan:600",
            )

    def test_percentage_split_success(self):
        result = calculate_split(
            total_paise=10000,
            split_type="PERCENTAGE",
            participants=[],
            split_values_raw="Aisha:50,Rohan:25,Priya:25",
        )

        self.assertEqual(
            result,
            {
                "Aisha": 5000,
                "Rohan": 2500,
                "Priya": 2500,
            },
        )

    def test_percentage_split_fails_when_total_not_100(self):
        with self.assertRaises(SplitCalculationError):
            calculate_split(
                total_paise=10000,
                split_type="PERCENTAGE",
                participants=[],
                split_values_raw="Aisha:50,Rohan:20,Priya:20",
            )

    def test_share_split_success(self):
        result = calculate_split(
            total_paise=40000,
            split_type="SHARE",
            participants=[],
            split_values_raw="Aisha:1,Rohan:2,Priya:1",
        )

        self.assertEqual(
            result,
            {
                "Aisha": 10000,
                "Rohan": 20000,
                "Priya": 10000,
            },
        )

    def test_share_split_fails_for_zero_share(self):
        with self.assertRaises(SplitCalculationError):
            calculate_split(
                total_paise=40000,
                split_type="SHARE",
                participants=[],
                split_values_raw="Aisha:1,Rohan:0",
            )

    def test_unsupported_split_type_fails(self):
        with self.assertRaises(SplitCalculationError):
            calculate_split(
                total_paise=10000,
                split_type="RANDOM",
                participants=["Aisha", "Rohan"],
            )

    def test_parse_named_values_with_different_separators(self):
        result = parse_named_values(
            "Aisha:10;Rohan:20|Priya:30"
        )

        self.assertEqual(str(result["Aisha"]), "10")
        self.assertEqual(str(result["Rohan"]), "20")
        self.assertEqual(str(result["Priya"]), "30")