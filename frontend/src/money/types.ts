export type Kind = "income" | "expense";

export type Entry = {
  id: string;
  kind: Kind;
  amount: number;
  occurred_on: string; // YYYY-MM-DD
  category: string;
  description: string | null;
  notes: string | null;
  created_at: string;
};

export type EntryInput = Omit<Entry, "id" | "created_at">;

export type BudgetLimit = { category: string; amount: number };

export type Summary = {
  month: string;
  total_income: number;
  total_expenses: number;
  remaining: number;
  savings_rate_percent: number | null;
  entry_count: number;
  categories: { category: string; spent: number; share_percent: number }[];
  budgets: { category: string; limit: number; spent: number; remaining: number; used_percent: number; status: "ok" | "near" | "over" }[];
  budget_total: number;
  budget_spent: number;
  budget_remaining: number;
  comparison: { previous_income: number; previous_expenses: number; expense_change: number } | null;
};

export const EXPENSE_CATEGORIES = [
  { value: "rent", label: "Rent" },
  { value: "food", label: "Food" },
  { value: "groceries", label: "Groceries" },
  { value: "transport", label: "Transport" },
  { value: "education", label: "Education" },
  { value: "medical", label: "Medical" },
  { value: "utilities", label: "Bills & utilities" },
  { value: "shopping", label: "Shopping" },
  { value: "family", label: "Family" },
  { value: "entertainment", label: "Entertainment" },
  { value: "emi", label: "Loan EMIs" },
  { value: "other", label: "Other" },
];

export const INCOME_CATEGORIES = [
  { value: "salary", label: "Salary" },
  { value: "allowance", label: "Pocket money / allowance" },
  { value: "freelance", label: "Freelance / part-time" },
  { value: "business", label: "Business" },
  { value: "other", label: "Other" },
];

export function categoryLabel(kind: Kind, value: string): string {
  const list = kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return list.find((c) => c.value === value)?.label ?? value;
}

export const MAX_ENTRY = 100_000_000;

/** Today as YYYY-MM-DD in the user's own time zone. */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function currentMonth(now: Date = new Date()): string {
  return todayISO(now).slice(0, 7);
}

/** shiftMonth("2026-01", -1) === "2025-12" */
export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + by;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export function dayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export type MonthTotal = { month: string; income: number; expenses: number; remaining: number };

/** "2026-11" -> "Nov" */
export function shortMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short" });
}
