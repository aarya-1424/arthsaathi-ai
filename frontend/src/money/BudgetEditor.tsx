import { useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import { Button } from "../ui/components";
import { AmountInput } from "../ui/fields";
import { EXPENSE_CATEGORIES, MAX_ENTRY, type BudgetLimit } from "./types";

/** Set a spending limit for each category this month. Leave a box empty for "no limit". Shown inside a pop-up. */
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
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate aria-label="Monthly budget">
      <p className="-mt-2 text-sm text-muted">Set a limit for the categories you want to watch. Leave the rest empty.</p>
      <div className="flex flex-col divide-y divide-line">
        {EXPENSE_CATEGORIES.map((c) => (
          <div key={c.value} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span>{c.label}</span>
            <span className="w-40">
              <AmountInput
                aria-label={`${c.label} limit`}
                placeholder="No limit"
                className="min-h-10"
                value={values[c.value] ?? ""}
                onChange={(digits) => setValues((v) => ({ ...v, [c.value]: digits }))}
              />
            </span>
          </div>
        ))}
      </div>
      <p className="border-t border-line pt-3 text-sm font-semibold">Total budget: ₹{total.toLocaleString("en-IN")}</p>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button variant="ghost" onClick={props.onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={saving} className="flex-1">{saving ? "Saving..." : "Save budget"}</Button>
      </div>
    </form>
  );
}
