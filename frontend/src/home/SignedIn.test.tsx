import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("../lib/supabase", () => ({ authConfigured: true, supabase: { auth } }));

import App from "../App";
import { spendingSegments } from "../money/MoneyPage";

const PROFILE = {
  display_name: "Rahul",
  onboarding_complete: true,
  financial: {
    occupation: "salaried", age_range: "25_34", state: "Maharashtra", monthly_income: 28000, income_source: "salary",
    monthly_expenses: 20000, monthly_savings: null, monthly_emi: null, dependents: null, emergency_fund: null,
    goals: ["emergency_fund", "other"], other_goal: "Wedding", knowledge_level: "beginner",
  },
};

let summaryBody: Record<string, unknown>;
let trendBody: unknown;

function emptySummary(month: string) {
  return { month, total_income: 0, total_expenses: 0, remaining: 0, savings_rate_percent: null, entry_count: 0, categories: [], budgets: [], budget_total: 0, budget_spent: 0, budget_remaining: 0, comparison: null };
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.getSession.mockResolvedValue({ data: { session: { access_token: "t", user: { email: "rahul@example.com" } } } });
  auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  summaryBody = {};
  trendBody = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    const month = new URL(url, "http://x").searchParams.get("month") ?? new URL(url, "http://x").searchParams.get("end") ?? "";
    const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
    if (url === "/api/profile") return ok(PROFILE);
    if (url.startsWith("/api/money/summary")) return ok({ ...emptySummary(month), ...summaryBody });
    if (url.startsWith("/api/money/trend")) return ok(trendBody);
    if (url.startsWith("/api/transactions")) return ok({ month, entries: [], truncated: false });
    if (url.startsWith("/api/budgets")) return ok({ month, limits: [] });
    throw new Error(`unexpected ${url}`);
  }));
});

test("home greets by name and invites the first entry when the month is empty", async () => {
  render(<App />);
  expect(await screen.findByRole("heading", { level: 1, name: "Rahul" })).toBeInTheDocument();
  expect(await screen.findByText("Let's start your month")).toBeInTheDocument();
  expect(screen.queryByRole("img", { name: /last 6 months/ })).not.toBeInTheDocument(); // no empty chart
});

test("home shows real totals and the 6-month chart when there is data", async () => {
  summaryBody = { total_income: 28000, total_expenses: 14000, remaining: 14000, savings_rate_percent: 50, entry_count: 4 };
  trendBody = [{ month: "2026-10", income: 0, expenses: 1200, remaining: -1200 }, { month: "2026-11", income: 28000, expenses: 14000, remaining: 14000 }];
  render(<App />);
  const region = await screen.findByRole("region", { name: "This month" });
  expect(within(region).getByText("₹28,000")).toBeInTheDocument();
  expect(within(region).getByText(/kept 50%/)).toBeInTheDocument();
  expect(await screen.findByRole("img", { name: /Money received and spent over the last 6 months/ })).toBeInTheDocument();
});

test("the Saathi panel suggests next steps from real data", async () => {
  render(<App />);
  const panel = await screen.findByRole("complementary", { name: "Saathi panel" });
  expect(await within(panel).findByRole("button", { name: /Add what you received and spent this month/ })).toBeInTheDocument();
});

test("rail/dock navigation moves between pages and marks the current one", async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole("heading", { level: 1, name: "Rahul" });

  await user.click(screen.getAllByRole("button", { name: "My Money" })[0]);
  expect(await screen.findByRole("heading", { level: 1, name: "My Money" })).toBeInTheDocument();
  for (const b of screen.getAllByRole("button", { name: "My Money" })) expect(b).toHaveAttribute("aria-current", "page");

  await user.click(screen.getAllByRole("button", { name: "Goals" })[0]);
  expect(await screen.findByText("Coming soon")).toBeInTheDocument();

  await user.click(screen.getAllByRole("button", { name: "Profile" })[0]);
  expect(await screen.findByRole("heading", { level: 1, name: "Your profile" })).toBeInTheDocument();
  expect(screen.getByText("Wedding")).toBeInTheDocument();
  expect(screen.getAllByText("Not shared").length).toBeGreaterThan(0);
});

test("sign out is on the profile page", async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole("heading", { level: 1, name: "Rahul" });
  await user.click(screen.getAllByRole("button", { name: "Profile" })[0]);
  await user.click(await screen.findByRole("button", { name: "Sign out" }));
  await waitFor(() => expect(auth.signOut).toHaveBeenCalled());
});

test("spending donut shows the top 5 and groups the rest", () => {
  const cats = ["rent", "food", "groceries", "transport", "medical", "shopping", "family"].map((c, i) => ({ category: c, spent: 1000 - i * 100, share_percent: 0 }));
  const segments = spendingSegments(cats);
  expect(segments.map((s) => s.label)).toEqual(["Rent", "Food", "Groceries", "Transport", "Medical", "Everything else"]);
  expect(segments[5].value).toBe(500 + 400); // shopping + family
});
