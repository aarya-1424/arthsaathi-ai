import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "../lib/api";
import { rupees } from "../profile/types";
import { BudgetEditor } from "./BudgetEditor";
import { EntryForm } from "./EntryForm";
import {
  categoryLabel, currentMonth, dayLabel, monthLabel, shiftMonth, todayISO,
  type BudgetLimit, type Entry, type Summary,
} from "./types";

type Data = { summary: Summary; entries: Entry[]; truncated: boolean; budget: BudgetLimit[] };
type Panel = { type: "none" } | { type: "add" } | { type: "edit"; entry: Entry } | { type: "budget" };

const STATUS_TEXT = { ok: "On track", near: "Close to limit", over: "Over limit" };
const STATUS_COLOUR = { ok: "bg-emerald-700", near: "bg-amber-500", over: "bg-red-600" };

export function MoneyPage(props: { onBack: () => void }) {
  const thisMonth = currentMonth();
  const [month, setMonth] = useState(thisMonth);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [panel, setPanel] = useState<Panel>({ type: "none" });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const latest = useRef(0); // ignore slow answers for a month the user already left

  const load = useCallback(async () => {
    const ticket = ++latest.current;
    setError("");
    try {
      const [summary, list, budget] = await Promise.all([
        api<Summary>(`/money/summary?month=${month}`),
        api<{ entries: Entry[]; truncated: boolean }>(`/transactions?month=${month}`),
        api<{ limits: BudgetLimit[] }>(`/budgets?month=${month}`),
      ]);
      if (ticket === latest.current) setData({ summary, entries: list.entries, truncated: list.truncated, budget: budget.limits });
    } catch (e) {
      if (ticket === latest.current) setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
    }
  }, [month]);

  useEffect(() => {
    setData(null);
    setPanel({ type: "none" });
    load();
  }, [load]);

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

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-8">
      <button className="w-fit text-sm underline" onClick={props.onBack}>← Back</button>
      <h1 className="text-2xl font-semibold">My Money</h1>

      <nav aria-label="Choose month" className="flex items-center justify-between">
        <button className="rounded border px-3 py-1" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}>‹</button>
        <span className="font-medium">{monthLabel(month)}</span>
        <button className="rounded border px-3 py-1 disabled:opacity-40" aria-label="Next month" disabled={month >= thisMonth}
          onClick={() => setMonth(shiftMonth(month, 1))}>›</button>
      </nav>

      {error && (
        <div role="alert" className="flex flex-col gap-2">
          <p>{error}</p>
          <button className="w-fit rounded border px-3 py-1" onClick={load}>Try again</button>
        </div>
      )}
      {!data && !error && <p>Loading...</p>}

      {data && s && (
        <>
          <section aria-label="Month summary" className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded border p-2"><p className="opacity-70">Received</p><p className="font-semibold">{rupees(s.total_income)}</p></div>
            <div className="rounded border p-2"><p className="opacity-70">Spent</p><p className="font-semibold">{rupees(s.total_expenses)}</p></div>
            <div className="rounded border p-2">
              <p className="opacity-70">{s.remaining < 0 ? "Overspent" : "Left"}</p>
              <p className={`font-semibold ${s.remaining < 0 ? "text-red-700" : ""}`}>{rupees(Math.abs(s.remaining))}</p>
            </div>
          </section>

          {s.savings_rate_percent !== null && s.remaining > 0 && (
            <p className="text-sm">You kept {s.savings_rate_percent}% of what you received this month.</p>
          )}
          {s.comparison && s.comparison.expense_change !== 0 && (
            <p className="text-sm">
              You spent {rupees(Math.abs(s.comparison.expense_change))} {s.comparison.expense_change > 0 ? "more" : "less"} than last month.
            </p>
          )}

          {panel.type === "none" && (
            <div className="flex gap-2">
              <button className="flex-1 rounded bg-emerald-800 px-4 py-2 text-white" onClick={() => setPanel({ type: "add" })}>+ Add entry</button>
              <button className="rounded border px-4 py-2" onClick={() => setPanel({ type: "budget" })}>
                {data.budget.length ? "Edit budget" : "Set budget"}
              </button>
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

          {s.budgets.length > 0 && (
            <section aria-label="Budget progress" className="flex flex-col gap-3">
              <h2 className="font-semibold">Budget</h2>
              <p className="text-sm">
                {s.budget_remaining >= 0
                  ? `${rupees(s.budget_remaining)} left of your ${rupees(s.budget_total)} budget.`
                  : `${rupees(-s.budget_remaining)} over your ${rupees(s.budget_total)} budget.`}
              </p>
              {s.budgets.map((b) => (
                <div key={b.category} className="text-sm">
                  <div className="flex justify-between">
                    <span>{categoryLabel("expense", b.category)}</span>
                    <span>{rupees(b.spent)} of {rupees(b.limit)}</span>
                  </div>
                  <div className="h-2 rounded bg-gray-200" role="progressbar" aria-label={`${categoryLabel("expense", b.category)} budget used`}
                    aria-valuenow={Math.min(b.used_percent, 100)} aria-valuemin={0} aria-valuemax={100}>
                    <div className={`h-2 rounded ${STATUS_COLOUR[b.status]}`} style={{ width: `${Math.min(b.used_percent, 100)}%` }} />
                  </div>
                  <span className="text-xs opacity-70">
                    {STATUS_TEXT[b.status]} · {b.remaining >= 0 ? `${rupees(b.remaining)} left` : `${rupees(-b.remaining)} over`}
                  </span>
                </div>
              ))}
            </section>
          )}

          {s.categories.length > 0 && (
            <section aria-label="Where your money went" className="flex flex-col gap-1 text-sm">
              <h2 className="font-semibold">Where your money went</h2>
              {s.categories.map((c) => (
                <p key={c.category} className="flex justify-between">
                  <span>{categoryLabel("expense", c.category)}</span>
                  <span>{rupees(c.spent)} · {c.share_percent}%</span>
                </p>
              ))}
            </section>
          )}

          <section aria-label="Entries" className="flex flex-col gap-2">
            <h2 className="font-semibold">Entries</h2>
            {data.entries.length === 0 && (
              <p className="text-sm opacity-70">
                Nothing recorded for {monthLabel(month)} yet. Add what you received and what you spent to see where your money goes.
              </p>
            )}
            {data.truncated && <p className="text-sm">Showing the latest 1,000 entries for this month.</p>}
            <ul className="flex flex-col divide-y">
              {data.entries.map((e) => (
                <li key={e.id} className="flex flex-col gap-1 py-2 text-sm">
                  <div className="flex justify-between">
                    <span>
                      {dayLabel(e.occurred_on)} · {categoryLabel(e.kind, e.category)}
                      {e.description && <span className="opacity-70"> · {e.description}</span>}
                    </span>
                    <span className={e.kind === "income" ? "text-emerald-800" : ""}>
                      {e.kind === "income" ? "+" : "−"}{rupees(e.amount)}
                    </span>
                  </div>
                  {confirmDelete === e.id ? (
                    <div className="flex items-center gap-2">
                      <span>Delete this entry?</span>
                      <button className="rounded border border-red-700 px-2 text-red-700" onClick={() => remove(e.id)}>Yes, delete</button>
                      <button className="rounded border px-2" onClick={() => { setConfirmDelete(null); setDeleteError(""); }}>No</button>
                      {deleteError && <span role="alert" className="text-red-700">{deleteError}</span>}
                    </div>
                  ) : (
                    <div className="flex gap-3 text-xs">
                      <button className="underline" onClick={() => setPanel({ type: "edit", entry: e })}>Edit</button>
                      <button className="underline" onClick={() => setConfirmDelete(e.id)}>Delete</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
