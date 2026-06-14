import { api } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";

export type Expense = {
  id: number;
  group: number;
  paid_by: number;
  paid_by_detail: {
    id: number;
    username: string;
    email: string;
  };
  description: string;
  expense_date: string;
  original_amount: string;
  original_currency: "INR" | "USD";
  amount_paise: number;
  amount_rupees: string;
  split_type: "EQUAL" | "EXACT" | "PERCENTAGE" | "SHARE";
  splits: {
    id: number;
    user: number;
    user_detail: {
      id: number;
      username: string;
      email: string;
    };
    owed_paise: number;
    owed_rupees: string;
    raw_value: string;
  }[];
  source_import_row: number | null;
  source_import_row_number: number | null;
};

export type Settlement = {
  id: number;
  group: number;
  paid_by: number;
  paid_by_detail: {
    id: number;
    username: string;
    email: string;
  };
  paid_to: number;
  paid_to_detail: {
    id: number;
    username: string;
    email: string;
  };
  amount_paise: number;
  amount_rupees: string;
  settlement_date: string;
  note: string;
};

export type CreateExpenseInput = {
  group: number;
  paid_by: number;
  description: string;
  category?: string;
  expense_date: string;
  original_amount: string;
  original_currency: "INR" | "USD";
  split_type: "EQUAL" | "EXACT" | "PERCENTAGE" | "SHARE";
  participants: number[];
  split_values_raw?: string;
};

export type CreateSettlementInput = {
  group: number;
  paid_by: number;
  paid_to: number;
  amount_paise: number;
  settlement_date: string;
  note: string;
};

export async function getExpenses() {
  const response = await api.get<Expense[]>(endpoints.expenses.list);

  return response.data;
}

export async function createExpense(payload: CreateExpenseInput) {
  const response = await api.post<Expense>(endpoints.expenses.list, payload);

  return response.data;
}

export async function getSettlements() {
  const response = await api.get<Settlement[]>(endpoints.settlements.list);

  return response.data;
}

export async function createSettlement(payload: CreateSettlementInput) {
  const response = await api.post<Settlement>(
    endpoints.settlements.list,
    payload,
  );

  return response.data;
}
