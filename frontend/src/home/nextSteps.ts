import { categoryLabel, type Summary } from "../money/types";
import { rupees } from "../profile/types";

export type StepAction = "money" | "profile";
export type NextStep = { id: string; text: string; action: StepAction; tone: "info" | "warn" | "danger" };

/**
 * Up to 3 helpful next steps, built ONLY from the user's real data.
 * Most urgent first. Never invents numbers.
 */
export function nextSteps(summary: Summary | null): NextStep[] {
  if (!summary) return [];
  const steps: NextStep[] = [];

  if (summary.entry_count === 0) {
    steps.push({ id: "first-entry", text: "Add what you received and spent this month", action: "money", tone: "info" });
  }
  for (const b of summary.budgets.filter((b) => b.status === "over")) {
    steps.push({ id: `over-${b.category}`, text: `You're over your ${categoryLabel("expense", b.category)} budget by ${rupees(-b.remaining)}`, action: "money", tone: "danger" });
  }
  if (summary.entry_count > 0 && summary.remaining < 0) {
    steps.push({ id: "overspent", text: `You've spent ${rupees(-summary.remaining)} more than you received this month`, action: "money", tone: "danger" });
  }
  for (const b of summary.budgets.filter((b) => b.status === "near")) {
    steps.push({ id: `near-${b.category}`, text: `Your ${categoryLabel("expense", b.category)} budget is almost used: ${rupees(b.remaining)} left`, action: "money", tone: "warn" });
  }
  if (summary.entry_count > 0 && summary.budgets.length === 0) {
    steps.push({ id: "set-budget", text: "Set a monthly budget to see how you're doing", action: "money", tone: "info" });
  }
  steps.push({ id: "profile", text: "Keep your profile up to date for better guidance", action: "profile", tone: "info" });

  return steps.slice(0, 3);
}
