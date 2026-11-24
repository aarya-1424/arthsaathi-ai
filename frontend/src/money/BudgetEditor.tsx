import { useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import { EXPENSE_CATEGORIES, MAX_ENTRY, monthLabel, type BudgetLimit } from "./types";

/** Set a spending limit for each category this month. Leave a box empty for "no limit". */
export function BudgetEditor(props: { month: string; current: BudgetLimit[]; onSaved: () => void; onCancel: () => void }) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(props.current.map((b) => [b.category, String(b.amount)])));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const total = Object.values(values).reduce((s, v) => s + (Number(v) || 0), 0);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    const limits = Object.entries(values)
      .filter(([, v]) => v !== "" && Number(v) > 0)
      .map(([category, v]) => ({ category, amount: Number(v) }));
    if (limits.some((l) => l.amount > MAX_ENTRY)) return setError("One of the amounts looks too large. Please check it.");
    setError("");
    setSaving(true);
    try {
      await api(`/budgets?month=${props.month}`, { method: "PUT", body: { limits } });
      props.onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded border p-4" noValidate aria-label="Monthly budget">
      <h2 className="font-semibold">Budget for {monthLabel(props.month)}</h2>
      <p className="text-sm opacity-70">Set a limit for the categories you want to watch. Leave the rest empty.</p>
      {EXPENSE_CATEGORIES.map((c) => (
        <label key={c.value} className="flex items-center justify-between gap-2 text-sm">
          <span>{c.label}</span>
          <span className="flex w-36 items-center rounded border">
            <span aria-hidden="true" className="px-2 opacity-60">₹</span>
            <input
              aria-label={`${c.label} limit`}
              className="w-full p-1"
              inputMode="numeric"
              placeholder="No limit"
              value={values[c.value] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [c.value]: e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 9) }))}
            />
          </span>
        </label>
      ))}
      <p className="text-sm">Total budget: ₹{total.toLocaleString("en-IN")}</p>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button type="button" className="rounded border px-4 py-2" onClick={props.onCancel}>Cancel</button>
        <button type="submit" disabled={saving} className="flex-1 rounded bg-emerald-800 px-4 py-2 text-white disabled:opacity-60">
          {saving ? "Saving..." : "Save budget"}
        </button>
      </div>
    </form>
  );
}
