import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("../lib/supabase", () => ({
  authConfigured: true,
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "tok" } } }) } },
}));

import { MoneyPage } from "./MoneyPage";
import { currentMonth, monthLabel, shiftMonth, todayISO } from "./types";

// ---------- a tiny fake server that remembers entries ----------

type Row = { id: string; kind: string; amount: number; occurred_on: string; category: string; description: string | null; notes: string | null; created_at: string };
let rows: Row[];
let budget: { category: string; amount: number }[];
let calls: { method: string; url: string; body?: unknown }[];
let failNext: number | null;

function ok(body: unknown, status = 200) {
  return { ok: true, status, json: async () => body };
}

function summary(month: string) {
  const mine = rows.filter((r) => r.occurred_on.startsWith(month));
  const income = mine.filter((r) => r.kind === "income").reduce((s, r) => s + r.amount, 0);
  const spent = mine.filter((r) => r.kind === "expense").reduce((s, r) => s + r.amount, 0);
  return {
    month, total_income: income, total_expenses: spent, remaining: income - spent,
    savings_rate_percent: income ? Math.round(((income - spent) / income) * 1000) / 10 : null,
    entry_count: mine.length, categories: [], comparison: null,
    budgets: budget.map((b) => ({ category: b.category, limit: b.amount, spent: 0, remaining: b.amount, used_percent: 0, status: "ok" })),
    budget_total: budget.reduce((s, b) => s + b.amount, 0), budget_spent: 0, budget_remaining: budget.reduce((s, b) => s + b.amount, 0),
  };
}

beforeEach(() => {
  rows = [];
  budget = [];
  calls = [];
  failNext = null;
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
    const method = init.method ?? "GET";
    const body = init.body ? JSON.parse(init.body as string) : undefined;
    calls.push({ method, url, body });
    if (failNext) {
      const status = failNext;
      failNext = null;
      return { ok: false, status, json: async () => ({ detail: "We could not reach the database. Please try again in a moment." }) };
    }
    const month = new URL(url, "http://x").searchParams.get("month") ?? "";
    if (url.startsWith("/api/money/summary")) return ok(summary(month));
    if (url.startsWith("/api/transactions?")) return ok({ month, entries: rows.filter((r) => r.occurred_on.startsWith(month)), truncated: false });
    if (url.startsWith("/api/budgets")) {
      if (method === "PUT") budget = body.limits;
      return ok({ month, limits: budget });
    }
    if (url === "/api/transactions" && method === "POST") {
      const row = { ...body, id: `id-${rows.length + 1}`, created_at: "2026-11-01T00:00:00Z" };
      rows.push(row);
      return ok(row, 201);
    }
    const id = url.split("/").pop()!;
    if (method === "PUT") {
      rows = rows.map((r) => (r.id === id ? { ...r, ...body } : r));
      return ok(rows.find((r) => r.id === id));
    }
    if (method === "DELETE") {
      rows = rows.filter((r) => r.id !== id);
      return { ok: true, status: 204, json: async () => ({}) };
    }
    throw new Error(`unexpected ${method} ${url}`);
  }));
});

const today = todayISO();

async function addEntry(user: ReturnType<typeof userEvent.setup>, opts: { received?: boolean; amount: string; category: string; description?: string }) {
  await user.click(screen.getByRole("button", { name: "+ Add entry" }));
  const form = screen.getByRole("form", { name: "Add entry" });
  if (opts.received) await user.click(within(form).getByLabelText("I received"));
  await user.type(within(form).getByLabelText("Amount"), opts.amount);
  await user.selectOptions(within(form).getByLabelText("Category"), opts.category);
  if (opts.description) await user.type(within(form).getByLabelText(/What was it for/), opts.description);
  await user.click(within(form).getByRole("button", { name: "Add" }));
}

test("empty month shows a friendly starting message", async () => {
  render(<MoneyPage onBack={vi.fn()} />);
  expect(await screen.findByText(/Nothing recorded for/)).toBeInTheDocument();
  expect(screen.getByText(monthLabel(currentMonth()))).toBeInTheDocument();
});

test("adding income and an expense updates the totals and the list", async () => {
  const user = userEvent.setup();
  render(<MoneyPage onBack={vi.fn()} />);
  await screen.findByText(/Nothing recorded/);

  await addEntry(user, { received: true, amount: "28000", category: "salary" });
  await screen.findByText("+₹28,000");
  await addEntry(user, { amount: "8000", category: "rent", description: "November rent" });
  await screen.findByText("−₹8,000");

  const summaryBox = screen.getByRole("region", { name: "Month summary" });
  expect(within(summaryBox).getByText("₹28,000")).toBeInTheDocument();
  expect(within(summaryBox).getByText("₹8,000")).toBeInTheDocument();
  expect(within(summaryBox).getByText("₹20,000")).toBeInTheDocument();
  expect(screen.getByText(/kept 71.4% of what you received/)).toBeInTheDocument();
  expect(screen.getByText(/November rent/)).toBeInTheDocument();

  const post = calls.find((c) => c.method === "POST")!;
  expect(post.body).toEqual({ kind: "income", amount: 28000, category: "salary", occurred_on: today, description: null, notes: null });
});

test("the form refuses empty amounts and missing categories without calling the server", async () => {
  const user = userEvent.setup();
  render(<MoneyPage onBack={vi.fn()} />);
  await screen.findByText(/Nothing recorded/);
  await user.click(screen.getByRole("button", { name: "+ Add entry" }));
  const form = screen.getByRole("form", { name: "Add entry" });
  await user.click(within(form).getByRole("button", { name: "Add" }));
  expect(within(form).getByRole("alert")).toHaveTextContent("more than ₹0");
  await user.type(within(form).getByLabelText("Amount"), "-12.5ab");
  expect(within(form).getByLabelText("Amount")).toHaveValue("125");
  await user.click(within(form).getByRole("button", { name: "Add" }));
  expect(within(form).getByRole("alert")).toHaveTextContent("choose a category");
  expect(calls.some((c) => c.method === "POST")).toBe(false);
});

test("switching between spent and received changes the categories", async () => {
  const user = userEvent.setup();
  render(<MoneyPage onBack={vi.fn()} />);
  await screen.findByText(/Nothing recorded/);
  await user.click(screen.getByRole("button", { name: "+ Add entry" }));
  const form = screen.getByRole("form", { name: "Add entry" });
  expect(within(form).getByRole("option", { name: "Rent" })).toBeInTheDocument();
  await user.click(within(form).getByLabelText("I received"));
  expect(within(form).queryByRole("option", { name: "Rent" })).not.toBeInTheDocument();
  expect(within(form).getByRole("option", { name: "Salary" })).toBeInTheDocument();
});

test("an entry can be edited", async () => {
  const user = userEvent.setup();
  rows = [{ id: "a", kind: "expense", amount: 450, occurred_on: today, category: "food", description: "Lunch", notes: null, created_at: "" }];
  render(<MoneyPage onBack={vi.fn()} />);
  await screen.findByText("−₹450");
  await user.click(screen.getByRole("button", { name: "Edit" }));
  const form = screen.getByRole("form", { name: "Change entry" });
  const amount = within(form).getByLabelText("Amount");
  await user.clear(amount);
  await user.type(amount, "600");
  await user.click(within(form).getByRole("button", { name: "Save changes" }));
  await screen.findByText("−₹600");
  expect(calls.some((c) => c.method === "PUT" && c.url === "/api/transactions/a")).toBe(true);
});

test("deleting asks first, and No keeps the entry", async () => {
  const user = userEvent.setup();
  rows = [{ id: "a", kind: "expense", amount: 450, occurred_on: today, category: "food", description: null, notes: null, created_at: "" }];
  render(<MoneyPage onBack={vi.fn()} />);
  await screen.findByText("−₹450");
  await user.click(screen.getByRole("button", { name: "Delete" }));
  await user.click(screen.getByRole("button", { name: "No" }));
  expect(calls.some((c) => c.method === "DELETE")).toBe(false);
  await user.click(screen.getByRole("button", { name: "Delete" }));
  await user.click(screen.getByRole("button", { name: "Yes, delete" }));
  await waitFor(() => expect(screen.queryByText("−₹450")).not.toBeInTheDocument());
});

test("setting a budget sends only the filled categories", async () => {
  const user = userEvent.setup();
  render(<MoneyPage onBack={vi.fn()} />);
  await screen.findByText(/Nothing recorded/);
  await user.click(screen.getByRole("button", { name: "Set budget" }));
  await user.type(screen.getByLabelText("Food limit"), "5000");
  await user.type(screen.getByLabelText("Rent limit"), "8000");
  expect(screen.getByText("Total budget: ₹13,000")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Save budget" }));
  await screen.findByText(/₹13,000 left of your ₹13,000 budget/);
  const put = calls.find((c) => c.method === "PUT" && c.url.startsWith("/api/budgets"))!;
  expect(put.url).toBe(`/api/budgets?month=${currentMonth()}`);
  expect(put.body).toEqual({ limits: [{ category: "food", amount: 5000 }, { category: "rent", amount: 8000 }] });
});

test("months can be browsed back, but not into the future", async () => {
  const user = userEvent.setup();
  render(<MoneyPage onBack={vi.fn()} />);
  await screen.findByText(/Nothing recorded/);
  expect(screen.getByRole("button", { name: "Next month" })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Previous month" }));
  const last = shiftMonth(currentMonth(), -1);
  expect(await screen.findByText(monthLabel(last))).toBeInTheDocument();
  await waitFor(() => expect(calls.some((c) => c.url === `/api/money/summary?month=${last}`)).toBe(true));
  expect(screen.getByRole("button", { name: "Next month" })).toBeEnabled();
});

test("a loading failure shows a message and Try again works", async () => {
  failNext = 503;
  const user = userEvent.setup();
  render(<MoneyPage onBack={vi.fn()} />);
  expect(await screen.findByText(/could not reach the database/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText(/Nothing recorded/)).toBeInTheDocument();
});
