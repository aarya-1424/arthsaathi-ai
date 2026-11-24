import { useId, useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import { rupees } from "../profile/types";
import { Button, Card, cn, fieldClass } from "../ui/components";
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

  const toggle = (value: Kind, text: string) => (
    <label
      className={cn(
        "flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-full text-sm transition",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-mint",
        kind === value ? "bg-mint font-semibold text-on-mint" : "text-muted hover:text-text",
      )}
    >
      <input type="radio" name="kind" className="sr-only" checked={kind === value} onChange={() => switchKind(value)} />
      {text}
    </label>
  );

  return (
    <Card variant="glass" className="p-5 sm:p-6">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate aria-label={e ? "Change entry" : "Add entry"}>
        <h2 className="text-lg font-semibold">{e ? "Change entry" : "Add an entry"}</h2>
        <fieldset className="flex gap-1 rounded-full border border-line bg-ink-900 p-1">
          <legend className="sr-only">Money in or out?</legend>
          {toggle("expense", "I spent")}
          {toggle("income", "I received")}
        </fieldset>

        <div className="flex flex-col gap-1.5 text-sm">
          <label htmlFor={ids.amount}>Amount</label>
          <span className="relative">
            <span aria-hidden="true" className="absolute top-1/2 left-3 -translate-y-1/2 text-muted">₹</span>
            <input id={ids.amount} className={`${fieldClass} pl-7 text-lg font-semibold`} inputMode="numeric" value={amount} placeholder="0"
              onChange={(ev) => setAmount(ev.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 9))} />
          </span>
          {amount && <span className="text-xs text-muted">{rupees(Number(amount))}</span>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 text-sm">
            <label htmlFor={ids.category}>Category</label>
            <select id={ids.category} className={fieldClass} value={category} onChange={(ev) => setCategory(ev.target.value)}>
              <option value="">Choose one</option>
              {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 text-sm">
            <label htmlFor={ids.date}>Date</label>
            <input id={ids.date} type="date" className={fieldClass} value={date} max={today} min="2000-01-01" onChange={(ev) => setDate(ev.target.value)} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 text-sm">
          <label htmlFor={ids.description}>What was it for? <span className="text-muted">(optional)</span></label>
          <input id={ids.description} className={fieldClass} maxLength={120} value={description} placeholder="Lunch with friends" onChange={(ev) => setDescription(ev.target.value)} />
        </div>

        <div className="flex flex-col gap-1.5 text-sm">
          <label htmlFor={ids.notes}>Notes <span className="text-muted">(optional)</span></label>
          <textarea id={ids.notes} className={`${fieldClass} py-2.5`} maxLength={500} rows={2} value={notes} onChange={(ev) => setNotes(ev.target.value)} />
        </div>

        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <Button variant="ghost" onClick={props.onCancel}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving} className="flex-1">
            {saving ? "Saving..." : e ? "Save changes" : "Add"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
