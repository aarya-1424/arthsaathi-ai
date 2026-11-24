import { useId, useState, type FormEvent, type ReactNode } from "react";
import { api, ApiError } from "../lib/api";
import {
  AGE_RANGES, GOALS, INCOME_SOURCES, KNOWLEDGE_LEVELS, MAX_MONTHLY, OCCUPATIONS, STATES, rupees,
  type Profile, type ProfileUpdate,
} from "./types";

type Form = {
  display_name: string;
  occupation: string;
  age_range: string;
  state: string;
  monthly_income: string;
  income_source: string;
  monthly_expenses: string;
  monthly_savings: string;
  monthly_emi: string;
  dependents: string;
  emergency_fund: string;
  goals: string[];
  other_goal: string;
  knowledge_level: string;
};

const STEPS = ["About you", "Your money", "Your goals", "Your comfort with money"];

function toForm(p: Profile | null): Form {
  const f = p?.financial;
  const s = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));
  return {
    display_name: p?.display_name ?? "",
    occupation: f?.occupation ?? "",
    age_range: f?.age_range ?? "",
    state: f?.state ?? "",
    monthly_income: s(f?.monthly_income),
    income_source: f?.income_source ?? "",
    monthly_expenses: s(f?.monthly_expenses),
    monthly_savings: s(f?.monthly_savings),
    monthly_emi: s(f?.monthly_emi),
    dependents: s(f?.dependents),
    emergency_fund: s(f?.emergency_fund),
    goals: f?.goals ?? [],
    other_goal: f?.other_goal ?? "",
    knowledge_level: f?.knowledge_level ?? "",
  };
}

const num = (v: string): number | null => (v === "" ? null : Number(v));

function toUpdate(f: Form): ProfileUpdate {
  return {
    display_name: f.display_name.trim() || null,
    occupation: f.occupation as ProfileUpdate["occupation"],
    age_range: f.age_range || null,
    state: f.state || null,
    monthly_income: Number(f.monthly_income),
    income_source: f.income_source || null,
    monthly_expenses: Number(f.monthly_expenses),
    monthly_savings: num(f.monthly_savings),
    monthly_emi: num(f.monthly_emi),
    dependents: num(f.dependents),
    emergency_fund: num(f.emergency_fund),
    goals: f.goals,
    other_goal: f.goals.includes("other") ? f.other_goal.trim() || null : null,
    knowledge_level: f.knowledge_level as ProfileUpdate["knowledge_level"],
  };
}

/** Returns a message if this step is not ready yet, or "" if it's fine. */
export function checkStep(step: number, f: Form): string {
  if (step === 0 && !f.occupation) return "Please tell us what you do.";
  if (step === 1) {
    if (f.monthly_income === "") return "Please enter your monthly income. Enter 0 if you have none.";
    if (f.monthly_expenses === "") return "Please enter your approximate monthly expenses.";
    const money = [f.monthly_income, f.monthly_expenses, f.monthly_savings, f.monthly_emi];
    if (money.some((v) => v !== "" && Number(v) > MAX_MONTHLY)) return "That amount looks too large. Please check it.";
    if (f.dependents !== "" && Number(f.dependents) > 20) return "Please enter 20 or fewer dependents.";
  }
  if (step === 3 && !f.knowledge_level) return "Please choose the option that fits you best.";
  return "";
}

export function ProfileWizard(props: {
  initial: Profile | null;
  mode: "onboarding" | "edit";
  onSaved: (p: Profile) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<Form>(() => toForm(props.initial));
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const last = step === STEPS.length - 1;

  const set = (key: keyof Form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  const toggleGoal = (g: string) =>
    setForm((f) => ({ ...f, goals: f.goals.includes(g) ? f.goals.filter((x) => x !== g) : [...f.goals, g] }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    const problem = checkStep(step, form);
    if (problem) return setError(problem);
    setError("");
    if (!last) return setStep(step + 1);
    setSaving(true);
    try {
      props.onSaved(await api<Profile>("/profile", { method: "PUT", body: toUpdate(form) }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const outgoing = ["monthly_expenses", "monthly_savings", "monthly_emi"].reduce(
    (sum, k) => sum + (Number(form[k as keyof Form]) || 0), 0);
  const overIncome = form.monthly_income !== "" && outgoing > Number(form.monthly_income);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-8">
      <p className="text-sm opacity-70">
        {props.mode === "onboarding" ? "Let's set up ArthSaathi for you" : "Edit your profile"} · Step {step + 1} of {STEPS.length}
      </p>
      <h1 className="text-2xl font-semibold">{STEPS[step]}</h1>

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {step === 0 && (
          <>
            <TextInput label="What should we call you?" value={form.display_name} maxLength={80} onChange={set("display_name")} />
            <Choice label="What do you do?" options={OCCUPATIONS} value={form.occupation} onChange={set("occupation")} />
            <Select label="Your age range" optional options={AGE_RANGES} value={form.age_range} onChange={set("age_range")} />
            <Select label="Your state" optional hint="Helps us find government schemes for you later." options={STATES.map((s) => ({ value: s, label: s }))} value={form.state} onChange={set("state")} />
          </>
        )}

        {step === 1 && (
          <>
            <div className="rounded border border-emerald-800/30 bg-emerald-50 p-3 text-sm">
              <p>We use these numbers only to give you advice that fits your life. Rough amounts are fine.</p>
              <p className="mt-1 font-medium">We will never ask for your bank password, UPI PIN, OTP or card PIN.</p>
            </div>
            <Money label="Monthly income (or pocket money)" value={form.monthly_income} onChange={set("monthly_income")} />
            <Select label="Where does it come from?" optional options={INCOME_SOURCES} value={form.income_source} onChange={set("income_source")} />
            <Money label="Monthly expenses (approximate)" value={form.monthly_expenses} onChange={set("monthly_expenses")} />
            <Money label="How much do you save each month?" optional value={form.monthly_savings} onChange={set("monthly_savings")} />
            <Money label="Loan EMIs each month" optional value={form.monthly_emi} onChange={set("monthly_emi")} />
            <TextInput label="People who depend on you financially" optional digitsOnly maxLength={2} value={form.dependents} onChange={set("dependents")} />
            <Money label="Savings kept aside for emergencies" optional value={form.emergency_fund} onChange={set("emergency_fund")} max={11} />
            {overIncome && (
              <p className="text-sm text-amber-800">
                Your expenses, savings and EMIs add up to more than your income. That's okay. You can adjust these any time.
              </p>
            )}
          </>
        )}

        {step === 2 && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm">What would you like help with? Pick any.</legend>
            {GOALS.map((g) => (
              <label key={g.value} className="flex items-center gap-2">
                <input type="checkbox" checked={form.goals.includes(g.value)} onChange={() => toggleGoal(g.value)} />
                {g.label}
              </label>
            ))}
            {form.goals.includes("other") && (
              <TextInput label="Tell us your goal" maxLength={100} value={form.other_goal} onChange={set("other_goal")} />
            )}
          </fieldset>
        )}

        {step === 3 && (
          <Choice
            label="How comfortable are you with money topics?"
            options={KNOWLEDGE_LEVELS.map((k) => ({ value: k.value, label: `${k.label}: ${k.hint}` }))}
            value={form.knowledge_level}
            onChange={set("knowledge_level")}
          />
        )}

        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

        <div className="flex gap-2">
          {step > 0 && (
            <button type="button" className="rounded border px-4 py-2" onClick={() => { setError(""); setStep(step - 1); }}>
              Back
            </button>
          )}
          {step === 0 && props.onCancel && (
            <button type="button" className="rounded border px-4 py-2" onClick={props.onCancel}>Cancel</button>
          )}
          <button type="submit" disabled={saving} className="flex-1 rounded bg-emerald-800 px-4 py-2 text-white disabled:opacity-60">
            {saving ? "Saving..." : last ? (props.mode === "onboarding" ? "Finish" : "Save changes") : "Next"}
          </button>
        </div>
      </form>
    </main>
  );
}

function Field(props: { id: string; label: string; optional?: boolean; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <label htmlFor={props.id}>
        {props.label} {props.optional && <span className="opacity-60">(optional)</span>}
      </label>
      {props.children}
      {props.hint && <span className="text-xs opacity-60">{props.hint}</span>}
    </div>
  );
}

function TextInput(props: { label: string; optional?: boolean; value: string; onChange: (v: string) => void; maxLength: number; digitsOnly?: boolean }) {
  const id = useId();
  return (
    <Field id={id} label={props.label} optional={props.optional}>
      <input
        id={id}
        className="rounded border p-2"
        inputMode={props.digitsOnly ? "numeric" : undefined}
        maxLength={props.maxLength}
        value={props.value}
        onChange={(e) => props.onChange(props.digitsOnly ? e.target.value.replace(/\D/g, "") : e.target.value)}
      />
    </Field>
  );
}

function Money(props: { label: string; optional?: boolean; value: string; onChange: (v: string) => void; max?: number }) {
  const id = useId();
  return (
    <Field id={id} label={props.label} optional={props.optional} hint={props.value ? rupees(Number(props.value)) : undefined}>
      <div className="flex items-center rounded border">
        <span aria-hidden="true" className="px-2 opacity-60">₹</span>
        <input
          id={id}
          className="w-full p-2"
          inputMode="numeric"
          value={props.value}
          // Keep only digits: no minus sign, no decimals, no letters.
          onChange={(e) => props.onChange(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, props.max ?? 9))}
        />
      </div>
    </Field>
  );
}

function Select(props: { label: string; optional?: boolean; hint?: string; options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <Field id={id} label={props.label} optional={props.optional} hint={props.hint}>
      <select id={id} className="rounded border p-2" value={props.value} onChange={(e) => props.onChange(e.target.value)}>
        <option value="">{props.optional ? "Prefer not to say" : "Choose one"}</option>
        {props.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  );
}

function Choice(props: { label: string; options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <fieldset className="flex flex-col gap-2 text-sm">
      <legend className="mb-1">{props.label}</legend>
      {props.options.map((o) => (
        <label key={o.value} className="flex items-center gap-2">
          <input type="radio" name={props.label} value={o.value} checked={props.value === o.value} onChange={() => props.onChange(o.value)} />
          {o.label}
        </label>
      ))}
    </fieldset>
  );
}
