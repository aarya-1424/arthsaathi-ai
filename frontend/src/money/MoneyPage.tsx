import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "../lib/api";
import { rupees } from "../profile/types";
import { AreaChart, CHART_COLOURS, Donut, Legend, type Segment } from "../ui/charts";
import { Button, Card, cn, Progress } from "../ui/components";
import { BudgetEditor } from "./BudgetEditor";
import { EntryForm } from "./EntryForm";
import {
  categoryLabel, currentMonth, dayLabel, monthLabel, shiftMonth, shortMonth, todayISO,
  type BudgetLimit, type Entry, type MonthTotal, type Summary,
} from "./types";

type Data = { summary: Summary; entries: Entry[]; truncated: boolean; budget: BudgetLimit[]; trend: MonthTotal[] | null };
type Panel = { type: "none" } | { type: "add" } | { type: "edit"; entry: Entry } | { type: "budget" };

const STATUS_TEXT = { ok: "On track", near: "Close to limit", over: "Over limit" };
const STATUS_COLOUR = { ok: "text-success", near: "text-warn", over: "text-danger" };
/** The two lines on the 6-month chart: money received (orange) and money spent (light grey, dashed). */
export function trendSeries(trend: MonthTotal[]) {
  return [
    { label: "Received", color: "#ff6a2b", values: trend.map((t) => t.income) },
    { label: "Spent", color: "#d6d3ce", values: trend.map((t) => t.expenses) },
  ];
}

/** Top 5 spending categories, and the rest grouped as "Everything else". */
export function spendingSegments(categories: Summary["categories"]): Segment[] {
  const top = categories.slice(0, 5).map((c, i) => ({ label: categoryLabel("expense", c.category), value: c.spent, color: CHART_COLOURS[i] }));
  const rest = categories.slice(5).reduce((s, c) => s + c.spent, 0);
  return rest > 0 ? [...top, { label: "Everything else", value: rest, color: CHART_COLOURS[5] }] : top;
}

export function MoneyPage(props: { startAdding?: boolean } = {}) {
  const thisMonth = currentMonth();
  const [month, setMonth] = useState(thisMonth);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [panel, setPanel] = useState<Panel>(props.startAdding ? { type: "add" } : { type: "none" });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const latest = useRef(0); // ignore slow answers for a month the user already left

  const load = useCallback(async () => {
    const ticket = ++latest.current;
    setError("");
    try {
      const [summary, list, budget, trend] = await Promise.all([
        api<Summary>(`/money/summary?month=${month}`),
        api<{ entries: Entry[]; truncated: boolean }>(`/transactions?month=${month}`),
        api<{ limits: BudgetLimit[] }>(`/budgets?month=${month}`),
        // The chart is a bonus: if it fails, the rest of the page still works.
        api<MonthTotal[]>(`/money/trend?end=${month}&months=6`).catch(() => null),
      ]);
      if (ticket === latest.current) setData({ summary, entries: list.entries, truncated: list.truncated, budget: budget.limits, trend });
    } catch (e) {
      if (ticket === latest.current) setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
    }
  }, [month]);

  useEffect(() => {
    setData(null);
    load();
  }, [load]);

  /** Changing month closes any open form (it belonged to the month you were looking at). */
  function changeMonth(next: string) {
    setPanel({ type: "none" });
    setMonth(next);
  }

  function saved() {
    setPanel({ type: "none" });
    load();
  }

  async function remove(id: string) {
    setDeleteError("");
    try {
      await api(`/transactions/${id}`, { method: "DELETE" });
      setConfirmDelete(null);
      load();
    } catch (e) {
      setDeleteError(e instanceof ApiError ? e.message : "Could not delete. Please try again.");
    }
  }

  const s = data?.summary;
  const hasTrendData = data?.trend?.some((t) => t.income > 0 || t.expenses > 0) ?? false;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">My Money</h1>
        <nav aria-label="Choose month" className="glass flex items-center gap-1 rounded-full p-1">
          <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full text-muted transition hover:bg-ink-800 hover:text-text active:scale-95"
            aria-label="Previous month" onClick={() => changeMonth(shiftMonth(month, -1))}>
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <span className="min-w-36 text-center text-sm font-semibold">{monthLabel(month)}</span>
          <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full text-muted transition hover:bg-ink-800 hover:text-text active:scale-95 disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label="Next month" disabled={month >= thisMonth} onClick={() => changeMonth(shiftMonth(month, 1))}>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </nav>
      </div>

      {error && (
        <Card role="alert" className="flex flex-col items-start gap-3">
          <p>{error}</p>
          <Button onClick={load}>Try again</Button>
        </Card>
      )}
      {!data && !error && <p className="text-muted">Loading...</p>}

      {data && s && (
        <>
          <section aria-label="Month summary" className="grid gap-4 sm:grid-cols-3">
            <Card variant="highlight" className="sm:col-span-3 lg:col-span-1">
              <p className="text-sm text-muted">{s.remaining < 0 ? "Overspent" : "Left"}</p>
              <p className={cn("mt-1 text-3xl font-semibold tracking-tight", s.remaining < 0 && "text-danger")}>{rupees(Math.abs(s.remaining))}</p>
              {s.savings_rate_percent !== null && s.remaining > 0 && (
                <p className="mt-2 text-sm text-accent">You kept {s.savings_rate_percent}% of what you received this month.</p>
              )}
            </Card>
            <Card className="lg:col-span-1">
              <p className="text-sm text-muted">Received</p>
              <p className="mt-1 text-2xl font-semibold">{rupees(s.total_income)}</p>
            </Card>
            <Card className="lg:col-span-1">
              <p className="text-sm text-muted">Spent</p>
              <p className="mt-1 text-2xl font-semibold">{rupees(s.total_expenses)}</p>
              {s.comparison && s.comparison.expense_change !== 0 && (
                <p className="mt-1 text-xs text-muted">
                  You spent {rupees(Math.abs(s.comparison.expense_change))} {s.comparison.expense_change > 0 ? "more" : "less"} than last month.
                </p>
              )}
            </Card>
          </section>

          {panel.type === "none" && (
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" onClick={() => setPanel({ type: "add" })}><Plus size={18} aria-hidden="true" />Add entry</Button>
              <Button onClick={() => setPanel({ type: "budget" })}>{data.budget.length ? "Edit budget" : "Set budget"}</Button>
            </div>
          )}
          {panel.type === "add" && (
            <EntryForm defaultDate={month === thisMonth ? todayISO() : `${month}-01`} onSaved={saved} onCancel={() => setPanel({ type: "none" })} />
          )}
          {panel.type === "edit" && (
            <EntryForm editing={panel.entry} defaultDate={panel.entry.occurred_on} onSaved={saved} onCancel={() => setPanel({ type: "none" })} />
          )}
          {panel.type === "budget" && (
            <BudgetEditor month={month} current={data.budget} onSaved={saved} onCancel={() => setPanel({ type: "none" })} />
          )}

          {(hasTrendData || s.categories.length > 0) && (
            <div className="grid gap-4 lg:grid-cols-5">
              {hasTrendData && data.trend && (
                <Card className={cn("flex flex-col gap-4", s.categories.length > 0 ? "lg:col-span-3" : "lg:col-span-5")}>
                  <h2 className="font-semibold">Last 6 months</h2>
                  <AreaChart
                    label="Money received and spent over the last 6 months"
                    labels={data.trend.map((t) => shortMonth(t.month))}
                    series={trendSeries(data.trend)}
                  />
                </Card>
              )}
              {s.categories.length > 0 && (
                <Card aria-label="Where your money went" role="region" className={cn("flex flex-col gap-4", hasTrendData ? "lg:col-span-2" : "lg:col-span-5")}>
                  <h2 className="font-semibold">Where your money went</h2>
                  <div className="flex flex-col items-center gap-5 sm:flex-row lg:flex-col xl:flex-row">
                    <Donut
                      segments={spendingSegments(s.categories)}
                      label={`Spending in ${monthLabel(month)}`}
                      size={150}
                      thickness={18}
                      center={<><span className="text-xs text-muted">Spent</span><span className="font-semibold">{rupees(s.total_expenses)}</span></>}
                    />
                    <div className="w-full flex-1"><Legend segments={spendingSegments(s.categories)} /></div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {s.budgets.length > 0 && (
            <section aria-label="Budget progress">
              <Card className="flex flex-col gap-5">
                <div>
                  <h2 className="font-semibold">Budget</h2>
                  <p className="text-sm text-muted">
                    {s.budget_remaining >= 0
                      ? `${rupees(s.budget_remaining)} left of your ${rupees(s.budget_total)} budget.`
                      : `${rupees(-s.budget_remaining)} over your ${rupees(s.budget_total)} budget.`}
                  </p>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  {s.budgets.map((b) => (
                    <div key={b.category} className="flex flex-col gap-2 text-sm">
                      <div className="flex justify-between gap-2">
                        <span>{categoryLabel("expense", b.category)}</span>
                        <span className="text-muted">{rupees(b.spent)} of {rupees(b.limit)}</span>
                      </div>
                      <Progress value={b.spent} max={b.limit} status={b.status} label={`${categoryLabel("expense", b.category)} budget used`} />
                      <span className={cn("text-xs", STATUS_COLOUR[b.status])}>
                        {b.remaining === 0 ? "Limit reached" : STATUS_TEXT[b.status]} · {b.remaining >= 0 ? `${rupees(b.remaining)} left` : `${rupees(-b.remaining)} over`}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </section>
          )}

          <section aria-label="Entries">
            <Card className="flex flex-col gap-2">
              <h2 className="font-semibold">Entries</h2>
              {data.entries.length === 0 && (
                <p className="text-sm text-muted">
                  Nothing recorded for {monthLabel(month)} yet. Add what you received and what you spent to see where your money goes.
                </p>
              )}
              {data.truncated && <p className="text-sm text-muted">Showing the latest 1,000 entries for this month.</p>}
              <ul className="flex flex-col divide-y divide-line">
                {data.entries.map((e) => (
                  <li key={e.id} className="group flex flex-col gap-2 py-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">{categoryLabel(e.kind, e.category)}{e.description && <span className="font-normal text-muted"> · {e.description}</span>}</span>
                        <span className="text-xs text-muted">{dayLabel(e.occurred_on)}</span>
                      </span>
                      <span className={cn("shrink-0 font-semibold", e.kind === "income" ? "text-success" : "text-text")}>
                        {e.kind === "income" ? "+" : "−"}{rupees(e.amount)}
                      </span>
                    </div>
                    {confirmDelete === e.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span>Delete this entry?</span>
                        <Button variant="danger" className="min-h-9 px-3" onClick={() => remove(e.id)}>Yes, delete</Button>
                        <Button variant="ghost" className="min-h-9 px-3" onClick={() => { setConfirmDelete(null); setDeleteError(""); }}>No</Button>
                        {deleteError && <span role="alert" className="text-danger">{deleteError}</span>}
                      </div>
                    ) : (
                      <div className="flex gap-1 text-xs">
                        <button type="button" className="flex min-h-9 items-center gap-1 rounded-full px-2 text-muted transition hover:bg-ink-800 hover:text-text" onClick={() => setPanel({ type: "edit", entry: e })}>
                          <Pencil size={14} aria-hidden="true" />Edit
                        </button>
                        <button type="button" className="flex min-h-9 items-center gap-1 rounded-full px-2 text-muted transition hover:bg-danger/10 hover:text-danger" onClick={() => setConfirmDelete(e.id)}>
                          <Trash2 size={14} aria-hidden="true" />Delete
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
