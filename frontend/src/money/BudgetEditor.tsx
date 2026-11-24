import { useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import { Button, Card } from "../ui/components";
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
    <Card variant="glass" className="p-5 sm:p-6">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate aria-label="Monthly budget">
        <div>
          <h2 className="text-lg font-semibold">Budget for {monthLabel(props.month)}</h2>
          <p className="text-sm text-muted">Set a limit for the categories you want to watch. Leave the rest empty.</p>
        </div>
        <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {EXPENSE_CATEGORIES.map((c) => (
            <label key={c.value} className="flex items-center justify-between gap-3 text-sm">
              <span>{c.label}</span>
              <span className="flex w-36 items-center rounded-xl border border-line bg-ink-800 transition focus-within:border-mint/60">
                <span aria-hidden="true" className="pl-3 text-muted">₹</span>
                <input
                  aria-label={`${c.label} limit`}
                  className="min-h-10 w-full bg-transparent px-2 text-text placeholder:text-muted/70 focus:outline-none"
                  inputMode="numeric"
                  placeholder="No limit"
                  value={values[c.value] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [c.value]: e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 9) }))}
                />
              </span>
            </label>
          ))}
        </div>
        <p className="text-sm">Total budget: ₹{total.toLocaleString("en-IN")}</p>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <Button variant="ghost" onClick={props.onCancel}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving} className="flex-1">{saving ? "Saving..." : "Save budget"}</Button>
        </div>
      </form>
    </Card>
  );
}
