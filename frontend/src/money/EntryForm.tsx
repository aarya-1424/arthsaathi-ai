import { useId, useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import { rupees } from "../profile/types";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, MAX_ENTRY, todayISO, type Entry, type EntryInput, type Kind } from "./types";

/** Add a new entry, or change an existing one (when `editing` is given). */
export function EntryForm(props: { editing?: Entry; defaultDate: string; onSaved: () => void; onCancel: () => void }) {
  const e = props.editing;
  const [kind, setKind] = useState<Kind>(e?.kind ?? "expense");
  const [amount, setAmount] = useState(e ? String(e.amount) : "");
  const [category, setCategory] = useState(e?.category ?? "");
  const [date, setDate] = useState(e?.occurred_on ?? props.defaultDate);
  const [description, setDescription] = useState(e?.description ?? "");
  const [notes, setNotes] = useState(e?.notes ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const ids = { amount: useId(), category: useId(), date: useId(), description: useId(), notes: useId() };
  const categories = kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const today = todayISO();

  function switchKind(next: Kind) {
    setKind(next);
    setCategory(""); // categories differ for money in and money out
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (saving) return;
    const value = Number(amount);
    if (!amount || value <= 0) return setError("Please enter an amount more than ₹0.");
    if (value > MAX_ENTRY) return setError("That amount looks too large. Please check it.");
    if (!category) return setError("Please choose a category.");
    if (!date) return setError("Please choose a date.");
    if (date > today) return setError("The date can't be in the future.");
    setError("");
    setSaving(true);
    const body: EntryInput = {
      kind, amount: value, category, occurred_on: date,
      description: description.trim() || null, notes: notes.trim() || null,
    };
    try {
      await api(e ? `/transactions/${e.id}` : "/transactions", { method: e ? "PUT" : "POST", body });
      props.onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded border p-4" noValidate aria-label={e ? "Change entry" : "Add entry"}>
      <fieldset className="flex gap-4 text-sm">
        <legend className="sr-only">Money in or out?</legend>
        <label className="flex items-center gap-1">
          <input type="radio" name="kind" checked={kind === "expense"} onChange={() => switchKind("expense")} /> I spent
        </label>
        <label className="flex items-center gap-1">
          <input type="radio" name="kind" checked={kind === "income"} onChange={() => switchKind("income")} /> I received
        </label>
      </fieldset>

      <label htmlFor={ids.amount} className="text-sm">Amount</label>
      <div className="flex items-center rounded border">
        <span aria-hidden="true" className="px-2 opacity-60">₹</span>
        <input id={ids.amount} className="w-full p-2" inputMode="numeric" value={amount}
          onChange={(ev) => setAmount(ev.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 9))} />
      </div>
      {amount && <span className="-mt-2 text-xs opacity-60">{rupees(Number(amount))}</span>}

      <label htmlFor={ids.category} className="text-sm">Category</label>
      <select id={ids.category} className="rounded border p-2" value={category} onChange={(ev) => setCategory(ev.target.value)}>
        <option value="">Choose one</option>
        {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>

      <label htmlFor={ids.date} className="text-sm">Date</label>
      <input id={ids.date} type="date" className="rounded border p-2" value={date} max={today} min="2000-01-01" onChange={(ev) => setDate(ev.target.value)} />

      <label htmlFor={ids.description} className="text-sm">What was it for? <span className="opacity-60">(optional)</span></label>
      <input id={ids.description} className="rounded border p-2" maxLength={120} value={description} onChange={(ev) => setDescription(ev.target.value)} />

      <label htmlFor={ids.notes} className="text-sm">Notes <span className="opacity-60">(optional)</span></label>
      <textarea id={ids.notes} className="rounded border p-2" maxLength={500} rows={2} value={notes} onChange={(ev) => setNotes(ev.target.value)} />

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button type="button" className="rounded border px-4 py-2" onClick={props.onCancel}>Cancel</button>
        <button type="submit" disabled={saving} className="flex-1 rounded bg-emerald-800 px-4 py-2 text-white disabled:opacity-60">
          {saving ? "Saving..." : e ? "Save changes" : "Add"}
        </button>
      </div>
    </form>
  );
}
