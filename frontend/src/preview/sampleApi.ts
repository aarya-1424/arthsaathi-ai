/**
 * DEVELOPMENT ONLY. A pretend server with SAMPLE data, so the signed-in screens can be previewed
 * without a real account. It answers /api/* calls in the browser; nothing is sent anywhere.
 * It is never included in the live app (see main.tsx).
 */
import { currentMonth, shiftMonth } from "../money/types";

type Row = { id: string; kind: "income" | "expense"; amount: number; occurred_on: string; category: string; description: string | null; notes: string | null; created_at: string };

const PROFILE = {
  display_name: "Rahul",
  onboarding_complete: true,
  financial: {
    occupation: "salaried", age_range: "25_34", state: "Maharashtra", monthly_income: 28000, income_source: "salary",
    monthly_expenses: 20000, monthly_savings: 3000, monthly_emi: 0, dependents: 2, emergency_fund: null,
    goals: ["emergency_fund", "save_money", "buy_gadget"], other_goal: null, knowledge_level: "beginner",
  },
};

let rows: Row[] = [];
let budgets: Record<string, { category: string; amount: number }[]> = {};

function seed() {
  const now = currentMonth();
  const plan: [number, [string, number, string][]][] = [
    [-5, [["rent", 8000, "Rent"], ["food", 5200, "Food"], ["transport", 1400, "Metro"], ["family", 5000, "Sent home"]]],
    [-4, [["rent", 8000, "Rent"], ["food", 4800, "Food"], ["shopping", 2600, "Clothes"], ["family", 5000, "Sent home"]]],
    [-3, [["rent", 8000, "Rent"], ["food", 6100, "Food"], ["medical", 1800, "Doctor"], ["family", 5000, "Sent home"]]],
    [-2, [["rent", 8000, "Rent"], ["food", 4400, "Food"], ["entertainment", 1500, "Movie"], ["family", 5000, "Sent home"]]],
    [-1, [["rent", 8000, "Rent"], ["food", 5000, "Food"], ["transport", 1600, "Metro"], ["family", 5000, "Sent home"]]],
    [0, [["rent", 8000, "Rent"], ["food", 4500, "Groceries and lunch"], ["transport", 1500, "Metro card"], ["shopping", 3800, "Shoes"], ["family", 5000, "Sent home"]]],
  ];
  rows = [];
  let n = 0;
  for (const [offset, spends] of plan) {
    const m = shiftMonth(now, offset);
    rows.push({ id: `s${n++}`, kind: "income", amount: 28000, occurred_on: `${m}-01`, category: "salary", description: "Salary", notes: null, created_at: "" });
    const extra = [0, 4500, 0, 2500, 6000, 3000][offset + 5]; // some months have freelance income
    if (extra) rows.push({ id: `s${n++}`, kind: "income", amount: extra, occurred_on: `${m}-20`, category: "freelance", description: "Weekend project", notes: null, created_at: "" });
    spends.forEach(([category, amount, description], i) =>
      rows.push({ id: `s${n++}`, kind: "expense", amount, occurred_on: `${m}-${String(3 + i * 4).padStart(2, "0")}`, category, description, notes: null, created_at: "" }));
  }
  budgets = { [now]: [{ category: "food", amount: 5000 }, { category: "rent", amount: 8000 }, { category: "shopping", amount: 3000 }, { category: "transport", amount: 3000 }] };
}

function status(limit: number, spent: number) {
  return spent > limit ? "over" : spent * 100 >= limit * 80 ? "near" : "ok";
}
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part * 1000) / whole) / 10 : null);

function summary(month: string) {
  const mine = rows.filter((r) => r.occurred_on.startsWith(month));
  const prev = rows.filter((r) => r.occurred_on.startsWith(shiftMonth(month, -1)));
  const income = mine.filter((r) => r.kind === "income").reduce((s, r) => s + r.amount, 0);
  const spent = mine.filter((r) => r.kind === "expense").reduce((s, r) => s + r.amount, 0);
  const byCat: Record<string, number> = {};
  mine.filter((r) => r.kind === "expense").forEach((r) => (byCat[r.category] = (byCat[r.category] ?? 0) + r.amount));
  const limits = budgets[month] ?? [];
  const b = limits.map((l) => ({ category: l.category, limit: l.amount, spent: byCat[l.category] ?? 0, remaining: l.amount - (byCat[l.category] ?? 0), used_percent: pct(byCat[l.category] ?? 0, l.amount) ?? 0, status: status(l.amount, byCat[l.category] ?? 0) }));
  const prevSpent = prev.filter((r) => r.kind === "expense").reduce((s, r) => s + r.amount, 0);
  return {
    month, total_income: income, total_expenses: spent, remaining: income - spent, savings_rate_percent: pct(income - spent, income),
    entry_count: mine.length,
    categories: Object.entries(byCat).sort((x, y) => y[1] - x[1]).map(([category, s]) => ({ category, spent: s, share_percent: pct(s, spent) ?? 0 })),
    budgets: b, budget_total: b.reduce((s, x) => s + x.limit, 0), budget_spent: b.reduce((s, x) => s + x.spent, 0),
    budget_remaining: b.reduce((s, x) => s + x.remaining, 0),
    comparison: prev.length ? { previous_income: 0, previous_expenses: prevSpent, expense_change: spent - prevSpent } : null,
  };
}

const reply = (body: unknown, status = 200) => Promise.resolve(new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

export function installSampleApi() {
  seed();
  const realFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!url.startsWith("/api/")) return realFetch(input, init);
    const u = new URL(url, window.location.origin);
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    const month = u.searchParams.get("month") ?? "";

    if (u.pathname === "/api/profile") return reply(PROFILE);
    if (u.pathname === "/api/money/summary") return reply(summary(month));
    if (u.pathname === "/api/money/trend") {
      const end = u.searchParams.get("end") ?? currentMonth();
      const count = Number(u.searchParams.get("months") ?? 6);
      return reply(Array.from({ length: count }, (_, i) => shiftMonth(end, i - count + 1)).map((m) => {
        const s = summary(m);
        return { month: m, income: s.total_income, expenses: s.total_expenses, remaining: s.remaining };
      }));
    }
    if (u.pathname === "/api/budgets") {
      if (method === "PUT") budgets[month] = body.limits;
      return reply({ month, limits: budgets[month] ?? [] });
    }
    if (u.pathname === "/api/transactions" && method === "GET") {
      return reply({ month, entries: rows.filter((r) => r.occurred_on.startsWith(month)).sort((a, b) => b.occurred_on.localeCompare(a.occurred_on)), truncated: false });
    }
    if (u.pathname === "/api/transactions" && method === "POST") {
      const row = { ...body, id: `n${Date.now()}`, created_at: new Date().toISOString() };
      rows.push(row);
      return reply(row, 201);
    }
    const id = u.pathname.split("/").pop();
    if (method === "PUT") {
      rows = rows.map((r) => (r.id === id ? { ...r, ...body } : r));
      return reply(rows.find((r) => r.id === id));
    }
    if (method === "DELETE") {
      rows = rows.filter((r) => r.id !== id);
      return reply(null, 204);
    }
    return reply({ detail: "Not in the sample preview" }, 404);
  };
}
