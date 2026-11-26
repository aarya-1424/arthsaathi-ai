import { useId, useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import { Button, cn, fieldClass } from "../ui/components";
import { AmountInput, DateField } from "../ui/fields";
import { MAX_GOAL, MAX_MONTHLY, PRIORITIES, type Goal, type GoalInput, type Priority } from "./types";

/** The form for a new goal, or for changing one (when `editing` is given). Shown inside a pop-up. */
export function GoalForm(props: { editing?: Goal; startName?: string; onSaved: (goal: Goal) => void; onCancel: () => void }) {
  const g = props.editing;
  const [name, setName] = useState(g?.name ?? props.startName ?? "");
  const [target, setTarget] = useState(g ? String(g.target_amount) : "");
  const [saved, setSaved] = useState(g && g.saved_amount > 0 ? String(g.saved_amount) : "");
  const [date, setDate] = useState(g?.target_date ?? "");
  const [monthly, setMonthly] = useState(g?.monthly_contribution ? String(g.monthly_contribution) : "");
  const [priority, setPriority] = useState<Priority>(g?.priority ?? "medium");
  const [notes, setNotes] = useState(g?.notes ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const ids = { name: useId(), target: useId(), saved: useId(), date: useId(), monthly: useId(), notes: useId() };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!name.trim()) return setError("Please give your goal a name.");
    if (!target || Number(target) <= 0) return setError("Please enter how much you need, more than ₹0.");
    if (Number(target) > MAX_GOAL || Number(saved || 0) > MAX_GOAL || Number(monthly || 0) > MAX_MONTHLY) {
      return setError("One of the amounts looks too large. Please check it.");
    }
    setError("");
    setSaving(true);
    const body: GoalInput = {
      name: name.trim(),
      target_amount: Number(target),
      saved_amount: Number(saved || 0),
      target_date: date || null,
      monthly_contribution: monthly && Number(monthly) > 0 ? Number(monthly) : null,
      priority,
      notes: notes.trim() || null,
    };
    try {
      props.onSaved(await api<Goal>(g ? `/goals/${g.id}` : "/goals", { method: g ? "PUT" : "POST", body }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  const optional = <span className="text-muted">(optional)</span>;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate aria-label={g ? "Change goal" : "New goal"}>
      <div className="flex flex-col gap-1.5 text-sm">
        <label htmlFor={ids.name}>What are you saving for?</label>
        <input id={ids.name} className={fieldClass} maxLength={80} value={name} placeholder="Emergency fund" onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 text-sm">
          <label htmlFor={ids.target}>How much do you need?</label>
          <AmountInput id={ids.target} value={target} onChange={setTarget} maxDigits={11} placeholder="60,000" />
        </div>
        <div className="flex flex-col gap-1.5 text-sm">
          <label htmlFor={ids.saved}>Saved so far {optional}</label>
          <AmountInput id={ids.saved} value={saved} onChange={setSaved} maxDigits={11} placeholder="0" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 text-sm">
          <label htmlFor={ids.date}>Target date {optional}</label>
          <DateField id={ids.date} value={date} min="2000-01-01" max="2100-12-31" onChange={setDate} />
          {date && <button type="button" className="w-fit text-xs text-muted underline-offset-4 hover:text-text hover:underline" onClick={() => setDate("")}>Remove date</button>}
        </div>
        <div className="flex flex-col gap-1.5 text-sm">
          <label htmlFor={ids.monthly}>Monthly saving {optional}</label>
          <AmountInput id={ids.monthly} value={monthly} onChange={setMonthly} placeholder="5,000" />
        </div>
      </div>

      <fieldset className="flex flex-col gap-1.5 text-sm">
        <legend className="mb-1.5">How important is it?</legend>
        <div className="flex gap-1 rounded-full border border-line bg-ink-950 p-1">
          {PRIORITIES.map((p) => (
            <label key={p.value}
              className={cn(
                "flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-full text-sm transition",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
                priority === p.value ? "bg-ink-800 font-semibold text-text shadow-soft" : "text-muted hover:text-text",
              )}>
              <input type="radio" name="priority" className="sr-only" checked={priority === p.value} onChange={() => setPriority(p.value)} />
              {p.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5 text-sm">
        <label htmlFor={ids.notes}>Notes {optional}</label>
        <textarea id={ids.notes} className={`${fieldClass} py-2.5`} maxLength={500} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2 pt-1">
        <Button variant="ghost" onClick={props.onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={saving} className="flex-1">
          {saving ? "Saving..." : g ? "Save changes" : "Create goal"}
        </Button>
      </div>
    </form>
  );
}

/** A small form to record money added to a goal. */
export function AddMoneyForm(props: { goal: Goal; onSaved: (goal: Goal, added: number) => void; onCancel: () => void }) {
  const id = useId();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const g = props.goal;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    const added = Number(amount);
    if (!amount || added <= 0) return setError("Please enter an amount more than ₹0.");
    if (g.saved_amount + added > MAX_GOAL) return setError("That amount looks too large. Please check it.");
    setError("");
    setSaving(true);
    const body: GoalInput = {
      name: g.name, target_amount: g.target_amount, saved_amount: g.saved_amount + added, target_date: g.target_date,
      monthly_contribution: g.monthly_contribution, priority: g.priority, notes: g.notes,
    };
    try {
      props.onSaved(await api<Goal>(`/goals/${g.id}`, { method: "PUT", body }), added);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate aria-label="Add money to goal">
      <p className="-mt-2 text-sm text-muted">
        You've saved ₹{g.saved_amount.toLocaleString("en-IN")} of ₹{g.target_amount.toLocaleString("en-IN")} so far.
      </p>
      <div className="flex flex-col gap-1.5 text-sm">
        <label htmlFor={id}>How much did you add?</label>
        <AmountInput id={id} value={amount} onChange={setAmount} maxDigits={11} placeholder="0" className="min-h-14 text-2xl font-semibold" />
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button variant="ghost" onClick={props.onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={saving} className="flex-1">{saving ? "Saving..." : "Add money"}</Button>
      </div>
    </form>
  );
}
