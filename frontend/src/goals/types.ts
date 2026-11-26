export type Priority = "high" | "medium" | "low";

/** What we send to the server to create or change a goal. Whole rupees. */
export type GoalInput = {
  name: string;
  target_amount: number;
  saved_amount: number;
  target_date: string | null; // YYYY-MM-DD
  monthly_contribution: number | null;
  priority: Priority;
  notes: string | null;
};

/** A goal as the server returns it. Everything below `created_at` is calculated by the server, never here. */
export type Goal = GoalInput & {
  id: string;
  created_at: string;
  remaining: number;
  progress_percent: number;
  completed: boolean;
  overdue: boolean;
  months_left: number | null;
  suggested_monthly: number | null;
  months_needed: number | null;
  estimated_completion: string | null; // YYYY-MM
  on_track: boolean | null;
};

export const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export const PRIORITY_LABEL: Record<Priority, string> = { high: "High priority", medium: "Medium priority", low: "Low priority" };

/** Common goals, offered as one-tap starting points. The user can type any name instead. */
export const QUICK_GOALS = ["Emergency fund", "Laptop or phone", "College fees", "Vehicle", "Family expense", "Pay off a loan"];

export const MAX_GOAL = 10_000_000_000; // ₹1,000 crore
export const MAX_MONTHLY = 100_000_000; // ₹10 crore a month

/** "2027-08" -> "Aug 2027" */
export function monthYear(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

/** The editable part of a goal, for sending it back with one thing changed. */
export function toInput(g: Goal): GoalInput {
  return {
    name: g.name,
    target_amount: g.target_amount,
    saved_amount: g.saved_amount,
    target_date: g.target_date,
    monthly_contribution: g.monthly_contribution,
    priority: g.priority,
    notes: g.notes,
  };
}
