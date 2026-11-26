import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("../lib/supabase", () => ({
  authConfigured: true,
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "tok" } } }) } },
}));

import { GoalsPage, planLines } from "./GoalsPage";
import { monthYear, toInput, type Goal } from "./types";

// ---------- a tiny fake server ----------
// The real maths lives on the server and is tested there. This fake only fills in the basics
// (to go, percent, reached) so the screen has something to show; plan numbers are given per test.

let rows: Goal[];
let calls: { method: string; url: string; body?: Record<string, unknown> }[];
let failNext: number | null;

function make(over: Partial<Goal> = {}): Goal {
  const base = {
    id: `g${Math.random()}`, name: "Laptop", target_amount: 60000, saved_amount: 15000, target_date: null, monthly_contribution: null,
    priority: "medium" as const, notes: null, created_at: "2026-11-01T00:00:00Z",
    overdue: false, months_left: null, suggested_monthly: null, months_needed: null, estimated_completion: null, on_track: null,
    ...over,
  };
  const remaining = Math.max(0, base.target_amount - base.saved_amount);
  return {
    ...base,
    // always worked out fresh from the amounts, so a changed goal never keeps old values
    remaining, completed: remaining === 0,
    progress_percent: Math.round((Math.min(base.saved_amount, base.target_amount) * 1000) / base.target_amount) / 10,
  };
}

beforeEach(() => {
  rows = [];
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
    const ok = (b: unknown, status = 200) => ({ ok: true, status, json: async () => b });
    if (url === "/api/goals" && method === "GET") return ok(rows);
    if (url === "/api/goals" && method === "POST") {
      const row = make({ ...body, id: "new" });
      rows.push(row);
      return ok(row, 201);
    }
    const id = url.split("/").pop()!;
    if (method === "PUT") {
      rows = rows.map((r) => (r.id === id ? make({ ...r, ...body, id }) : r));
      return ok(rows.find((r) => r.id === id));
    }
    if (method === "DELETE") {
      rows = rows.filter((r) => r.id !== id);
      return { ok: true, status: 204, json: async () => ({}) };
    }
    throw new Error(`unexpected ${method} ${url}`);
  }));
});

type User = ReturnType<typeof userEvent.setup>;

// ---------- empty state and creating ----------

test("with no goals, the page invites you to start and offers common goals", async () => {
  const user = userEvent.setup();
  render(<GoalsPage />);
  expect(await screen.findByText("What are you saving for?")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Emergency fund" }));
  const dialog = screen.getByRole("dialog", { name: "New goal" });
  expect(within(dialog).getByLabelText("What are you saving for?")).toHaveValue("Emergency fund");
});

async function openNew(user: User) {
  await user.click(await screen.findByRole("button", { name: "Create your own goal" }));
  return screen.getByRole("form", { name: "New goal" });
}

test("creating a goal sends plain numbers and shows the new goal", async () => {
  const user = userEvent.setup();
  render(<GoalsPage />);
  const form = await openNew(user);
  await user.type(within(form).getByLabelText("What are you saving for?"), "  Laptop ");
  await user.type(within(form).getByLabelText("How much do you need?"), "60000");
  expect(within(form).getByLabelText("How much do you need?")).toHaveValue("60,000");
  await user.type(within(form).getByLabelText(/Saved so far/), "15000");
  await user.click(within(form).getByLabelText("High"));
  await user.click(within(form).getByRole("button", { name: "Create goal" }));

  const card = await screen.findByRole("group", { name: "Laptop" });
  expect(calls.find((c) => c.method === "POST")!.body).toEqual({
    name: "Laptop", target_amount: 60000, saved_amount: 15000, target_date: null, monthly_contribution: null, priority: "high", notes: null,
  });
  expect(within(card).getByText("₹15,000")).toBeInTheDocument();
  expect(within(card).getByText("25%")).toBeInTheDocument();
  expect(within(card).getByText("₹45,000 to go")).toBeInTheDocument();
  expect(within(card).getByRole("progressbar", { name: "Laptop progress" })).toHaveAttribute("aria-valuenow", "25");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("Goal added");
});

test("the form needs a name and a target before it calls the server", async () => {
  const user = userEvent.setup();
  render(<GoalsPage />);
  const form = await openNew(user);
  await user.click(within(form).getByRole("button", { name: "Create goal" }));
  expect(within(form).getByRole("alert")).toHaveTextContent("give your goal a name");
  await user.type(within(form).getByLabelText("What are you saving for?"), "Vehicle");
  await user.click(within(form).getByRole("button", { name: "Create goal" }));
  expect(within(form).getByRole("alert")).toHaveTextContent("more than ₹0");
  expect(calls.some((c) => c.method === "POST")).toBe(false);
});

test("a server error stays in the form and the goal can be saved on the next try", async () => {
  const user = userEvent.setup();
  render(<GoalsPage />);
  const form = await openNew(user);
  await user.type(within(form).getByLabelText("What are you saving for?"), "Vehicle");
  await user.type(within(form).getByLabelText("How much do you need?"), "90000");
  failNext = 503;
  await user.click(within(form).getByRole("button", { name: "Create goal" }));
  expect(await within(form).findByRole("alert")).toHaveTextContent("could not reach the database");
  await user.click(within(form).getByRole("button", { name: "Create goal" }));
  expect(await screen.findByRole("group", { name: "Vehicle" })).toBeInTheDocument();
});

// ---------- what a goal card says ----------

test("a goal card shows the plan using the server's numbers", async () => {
  rows = [make({ target_date: "2027-03-31", monthly_contribution: 5000, months_left: 4, suggested_monthly: 11250, months_needed: 9, estimated_completion: "2027-08", on_track: false })];
  render(<GoalsPage />);
  const card = await screen.findByRole("group", { name: "Laptop" });
  expect(within(card).getByText("Medium priority · by 31 Mar 2027")).toBeInTheDocument();
  expect(within(card).getByText("To reach it by 31 Mar 2027, save about ₹11,250 a month (4 months left).")).toBeInTheDocument();
  expect(within(card).getByText("At ₹5,000 a month, you'd reach it around Aug 2027.")).toBeInTheDocument();
  expect(within(card).getByText("At this pace you'd get there after your target date.")).toBeInTheDocument();
  expect(screen.getByText(/Plans assume you save the same amount every month/)).toBeInTheDocument();
});

test("planLines covers each situation in plain words", () => {
  expect(planLines(make()).map((l) => l.text)).toEqual(["Add a target date or a monthly amount to see a plan."]);
  expect(planLines(make({ saved_amount: 60000 }))).toEqual([{ tone: "good", text: "Goal reached. Well done." }]);
  expect(planLines(make({ target_date: "2026-12-15", months_left: 1, suggested_monthly: 45000 }))[0].text).toContain("(1 month left)");
  expect(planLines(make({ target_date: "2027-03-31", monthly_contribution: 12000, months_left: 4, suggested_monthly: 11250, months_needed: 4, estimated_completion: "2027-03", on_track: true })).at(-1))
    .toEqual({ tone: "good", text: "You're on track for your target date." });
  const overdue = planLines(make({ target_date: "2026-01-01", overdue: true, monthly_contribution: 500, months_needed: 90, estimated_completion: "2034-05", on_track: false }));
  expect(overdue[0]).toEqual({ tone: "warn", text: "The target date (1 Jan 2026) has passed. You can set a new date." });
  expect(overdue.map((l) => l.text)).not.toContain("At this pace you'd get there after your target date."); // already said it has passed
  expect(planLines(make({ monthly_contribution: 1, months_needed: 45000 }))[0].text).toContain("a very long time");
});

test("a reached goal says so, shows 100%, and offers no Add money", async () => {
  rows = [make({ name: "Trip home", saved_amount: 60000 })];
  render(<GoalsPage />);
  const card = await screen.findByRole("group", { name: "Trip home" });
  expect(within(card).getByText("Goal reached. Well done.")).toBeInTheDocument();
  expect(within(card).getByText("100%")).toBeInTheDocument();
  expect(within(card).queryByRole("button", { name: "Add money" })).not.toBeInTheDocument();
  expect(within(card).queryByText(/to go/)).not.toBeInTheDocument();
});

// ---------- changing goals ----------

test("Add money sends the new total and confirms", async () => {
  const user = userEvent.setup();
  rows = [make({ id: "a", notes: "For my course", priority: "high" })];
  render(<GoalsPage />);
  const card = await screen.findByRole("group", { name: "Laptop" });
  await user.click(within(card).getByRole("button", { name: "Add money" }));
  const dialog = screen.getByRole("dialog", { name: "Add money to Laptop" });
  await user.click(within(dialog).getByRole("button", { name: "Add money" }));
  expect(within(dialog).getByRole("alert")).toHaveTextContent("more than ₹0");
  await user.type(within(dialog).getByLabelText("How much did you add?"), "5000");
  await user.click(within(dialog).getByRole("button", { name: "Add money" }));

  await screen.findByText("₹20,000");
  const put = calls.find((c) => c.method === "PUT")!;
  expect(put.url).toBe("/api/goals/a");
  expect(put.body).toEqual({ ...toInput(rows[0]), saved_amount: 20000 }); // everything else unchanged
  expect(put.body).toMatchObject({ notes: "For my course", priority: "high" });
  expect(screen.getByRole("status")).toHaveTextContent("Added ₹5,000 to Laptop");
});

test("adding the last amount celebrates the goal", async () => {
  const user = userEvent.setup();
  rows = [make({ id: "a", saved_amount: 55000 })];
  render(<GoalsPage />);
  await user.click(await screen.findByRole("button", { name: "Add money" }));
  await user.type(screen.getByLabelText("How much did you add?"), "5000");
  await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Add money" }));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Goal reached: Laptop"));
});

test("a goal can be edited from its options", async () => {
  const user = userEvent.setup();
  rows = [make({ id: "a", target_date: "2027-03-31", monthly_contribution: 5000 })];
  render(<GoalsPage />);
  await user.click(await screen.findByRole("button", { name: "Options for Laptop" }));
  await user.click(screen.getByRole("button", { name: "Edit" }));
  const form = screen.getByRole("form", { name: "Change goal" });
  expect(within(form).getByLabelText("How much do you need?")).toHaveValue("60,000");
  expect(within(form).getByLabelText(/Monthly saving/)).toHaveValue("5,000");
  await user.click(within(form).getByRole("button", { name: "Remove date" }));
  const name = within(form).getByLabelText("What are you saving for?");
  await user.clear(name);
  await user.type(name, "New laptop");
  await user.click(within(form).getByRole("button", { name: "Save changes" }));
  expect(await screen.findByRole("group", { name: "New laptop" })).toBeInTheDocument();
  expect(calls.find((c) => c.method === "PUT")!.body).toMatchObject({ name: "New laptop", target_date: null, monthly_contribution: 5000 });
  expect(screen.getByRole("status")).toHaveTextContent("Goal updated");
});

test("deleting a goal asks first", async () => {
  const user = userEvent.setup();
  rows = [make({ id: "a" })];
  render(<GoalsPage />);
  await user.click(await screen.findByRole("button", { name: "Options for Laptop" }));
  await user.click(screen.getByRole("button", { name: "Delete" }));
  await user.click(screen.getByRole("button", { name: "No" }));
  expect(calls.some((c) => c.method === "DELETE")).toBe(false);
  await user.click(screen.getByRole("button", { name: "Delete" }));
  await user.click(screen.getByRole("button", { name: "Yes, delete" }));
  expect(await screen.findByText("What are you saving for?")).toBeInTheDocument(); // back to the empty state
  expect(screen.getByRole("status")).toHaveTextContent("Goal deleted");
});

// ---------- loading and errors ----------

test("placeholders show while loading, and a failed load can be retried", async () => {
  failNext = 503;
  const user = userEvent.setup();
  render(<GoalsPage />);
  expect(screen.getByRole("status", { name: "Loading your goals" })).toBeInTheDocument();
  expect(await screen.findByText(/could not reach the database/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("What are you saving for?")).toBeInTheDocument();
});

test("helpers: month names and the editable part of a goal", () => {
  expect(monthYear("2027-08")).toBe("Aug 2027");
  expect(monthYear("2026-12")).toBe("Dec 2026");
  expect(Object.keys(toInput(make())).sort()).toEqual(["monthly_contribution", "name", "notes", "priority", "saved_amount", "target_amount", "target_date"]);
});
