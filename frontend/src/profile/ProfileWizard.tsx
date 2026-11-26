import {
  ArrowLeft, ArrowRight, Award, BookOpen, Briefcase, Car, Check, GraduationCap, HandCoins, House, Laptop, Lock,
  PiggyBank, Receipt, ShieldCheck, Sparkles, Sprout, Store, TrendingUp, User, Users, Wallet, type LucideIcon,
} from "lucide-react";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { api, ApiError } from "../lib/api";
import { Button, Card, cn, fieldClass, GlowBackground } from "../ui/components";
import { AmountInput, selectClass } from "../ui/fields";
import { Logo } from "../ui/Logo";
import {
  AGE_RANGES, amountChoices, GOALS, INCOME_SOURCES, KNOWLEDGE_LEVELS, MAX_MONTHLY, OCCUPATIONS, STATES, rupees,
  type MoneyField, type Profile, type ProfileUpdate,
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

const STEPS = [
  { title: "About you", hint: "A little about who you are" },
  { title: "Your money", hint: "Rough monthly amounts" },
  { title: "Your goals", hint: "What you'd like help with" },
  { title: "Your comfort with money", hint: "So we explain things your way" },
];

const OCCUPATION_ICONS: Record<string, LucideIcon> = {
  student: GraduationCap, salaried: Briefcase, self_employed: Store, homemaker: House, other: User,
};
const KNOWLEDGE_ICONS: Record<string, LucideIcon> = { beginner: Sprout, basic: BookOpen, intermediate: TrendingUp, advanced: Award };
const GOAL_ICONS: Record<string, LucideIcon> = {
  save_money: PiggyBank, emergency_fund: ShieldCheck, manage_expenses: Wallet, pay_off_debt: HandCoins, buy_gadget: Laptop,
  buy_vehicle: Car, education: GraduationCap, family_expense: Users, learn_investing: TrendingUp, understand_taxes: Receipt,
  other: Sparkles,
};

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
  const heading = props.mode === "onboarding" ? "Let's set up ArthSaathi for you" : "Edit your profile";

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
    <div className="theme-dark relative isolate min-h-dvh">
      <GlowBackground />
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-10 lg:py-10">
        {/* Journey panel: steps on the left (computer), progress bar on top (phone) */}
        <aside className="flex flex-col gap-6 lg:sticky lg:top-10 lg:self-start">
          <Logo size={34} />
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{heading}</h2>
            <p className="mt-1 text-sm text-muted">Step {step + 1} of {STEPS.length}</p>
          </div>
          <div className="flex gap-1.5 lg:hidden" aria-hidden="true">
            {STEPS.map((s, i) => (
              <span key={s.title} className={cn("h-1.5 flex-1 rounded-full transition-colors duration-300", i <= step ? "bg-accent" : "bg-line")} />
            ))}
          </div>
          <ol className="hidden flex-col gap-1 lg:flex">
            {STEPS.map((s, i) => {
              const done = i < step;
              const current = i === step;
              return (
                <li key={s.title} aria-current={current ? "step" : undefined}
                  className={cn("flex items-center gap-3 rounded-2xl p-3 transition", current && "border border-accent/30 bg-ink-850 shadow-soft")}>
                  <span className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                    done ? "bg-accent text-on-accent" : current ? "border-2 border-accent text-accent" : "border border-line text-muted",
                  )}>
                    {done ? <Check size={16} aria-hidden="true" /> : i + 1}
                  </span>
                  <span className="flex flex-col">
                    <span className={cn("text-sm font-semibold", !current && !done && "text-muted")}>{s.title}</span>
                    <span className="text-xs text-muted">{s.hint}</span>
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="hidden items-start gap-2 text-xs text-muted lg:flex">
            <Lock size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-accent" />
            Only you can see these answers. You can change them any time.
          </p>
        </aside>

        <Card key={step} className="pop-in p-5 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{STEPS[step].title}</h1>
          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-6" noValidate>
            {step === 0 && (
              <>
                <TextInput label="What should we call you?" value={form.display_name} maxLength={80} onChange={set("display_name")} />
                <CardChoice
                  label="What do you do?"
                  columns="sm:grid-cols-3"
                  options={OCCUPATIONS.map((o) => ({ ...o, icon: OCCUPATION_ICONS[o.value] }))}
                  value={form.occupation}
                  onChange={set("occupation")}
                />
                <div className="grid gap-5 sm:grid-cols-2">
                  <Select label="Your age range" optional options={AGE_RANGES} value={form.age_range} onChange={set("age_range")} />
                  <Select label="Your state" optional hint="Helps us find government schemes for you later." options={STATES.map((s) => ({ value: s, label: s }))} value={form.state} onChange={set("state")} />
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="flex gap-3 rounded-2xl border border-accent/25 bg-accent/[0.07] p-4 text-sm">
                  <ShieldCheck size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-accent" />
                  <div>
                    <p>We use these numbers only to give you advice that fits your life. Rough amounts are fine.</p>
                    <p className="mt-1 font-semibold">We will never ask for your bank password, UPI PIN, OTP or card PIN.</p>
                  </div>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Money label="Monthly income (or pocket money)" choices={amountChoices("monthly_income" as MoneyField, form.occupation)} value={form.monthly_income} onChange={set("monthly_income")} />
                  <Select label="Where does it come from?" optional options={INCOME_SOURCES} value={form.income_source} onChange={set("income_source")} />
                  <Money label="Monthly expenses (approximate)" choices={amountChoices("monthly_expenses" as MoneyField, form.occupation)} value={form.monthly_expenses} onChange={set("monthly_expenses")} />
                  <Money label="How much do you save each month?" optional choices={amountChoices("monthly_savings" as MoneyField, form.occupation)} value={form.monthly_savings} onChange={set("monthly_savings")} />
                  <Money label="Loan EMIs each month" optional choices={amountChoices("monthly_emi" as MoneyField, form.occupation)} value={form.monthly_emi} onChange={set("monthly_emi")} />
                  <TextInput label="People who depend on you financially" optional digitsOnly maxLength={2} value={form.dependents} onChange={set("dependents")} />
                  <Money label="Savings kept aside for emergencies" optional choices={amountChoices("emergency_fund" as MoneyField, form.occupation)} value={form.emergency_fund} onChange={set("emergency_fund")} max={11} />
                </div>
                {overIncome && (
                  <p className="rounded-xl border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn">
                    Your expenses, savings and EMIs add up to more than your income. That's okay. You can adjust these any time.
                  </p>
                )}
              </>
            )}

            {step === 2 && (
              <fieldset className="flex flex-col gap-3">
                <legend className="mb-3 text-sm text-muted">What would you like help with? Pick any.</legend>
                <div className="flex flex-wrap gap-2">
                  {GOALS.map((g) => {
                    const Icon = GOAL_ICONS[g.value] ?? Sparkles;
                    const on = form.goals.includes(g.value);
                    return (
                      <label key={g.value}
                        className={cn(
                          "flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm transition duration-200 active:scale-[0.97]",
                          "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                          on ? "border-accent bg-accent/15 font-semibold text-text" : "border-line text-muted hover:border-accent/50 hover:text-text",
                        )}>
                        <input type="checkbox" className="sr-only" checked={on} onChange={() => toggleGoal(g.value)} />
                        <Icon size={16} aria-hidden="true" className={on ? "text-accent" : undefined} />
                        {g.label}
                      </label>
                    );
                  })}
                </div>
                {form.goals.includes("other") && (
                  <TextInput label="Tell us your goal" maxLength={100} value={form.other_goal} onChange={set("other_goal")} />
                )}
              </fieldset>
            )}

            {step === 3 && (
              <CardChoice
                label="How comfortable are you with money topics?"
                columns="sm:grid-cols-2"
                options={KNOWLEDGE_LEVELS.map((k) => ({ value: k.value, label: k.label, hint: k.hint, icon: KNOWLEDGE_ICONS[k.value] }))}
                value={form.knowledge_level}
                onChange={set("knowledge_level")}
              />
            )}

            {error && <p role="alert" className="text-sm text-danger">{error}</p>}

            <div className="flex gap-3 border-t border-line pt-5">
              {step > 0 && (
                <Button variant="ghost" onClick={() => { setError(""); setStep(step - 1); }}>
                  <ArrowLeft size={16} aria-hidden="true" />Back
                </Button>
              )}
              {step === 0 && props.onCancel && <Button variant="ghost" onClick={props.onCancel}>Cancel</Button>}
              <Button type="submit" variant="primary" disabled={saving} className="ml-auto min-w-36">
                {saving ? "Saving..." : last ? (props.mode === "onboarding" ? "Finish" : "Save changes") : "Next"}
                {!saving && !last && <ArrowRight size={16} aria-hidden="true" />}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

function Field(props: { id: string; label: string; optional?: boolean; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <label htmlFor={props.id}>
        {props.label} {props.optional && <span className="text-muted">(optional)</span>}
      </label>
      {props.children}
      {props.hint && <span className="text-xs text-muted">{props.hint}</span>}
    </div>
  );
}

function TextInput(props: { label: string; optional?: boolean; value: string; onChange: (v: string) => void; maxLength: number; digitsOnly?: boolean }) {
  const id = useId();
  return (
    <Field id={id} label={props.label} optional={props.optional}>
      <input
        id={id}
        className={fieldClass}
        inputMode={props.digitsOnly ? "numeric" : undefined}
        maxLength={props.maxLength}
        value={props.value}
        onChange={(e) => props.onChange(props.digitsOnly ? e.target.value.replace(/\D/g, "") : e.target.value)}
      />
    </Field>
  );
}

const OTHER = "other";

/** A dropdown of common amounts, plus "Other amount" which opens a box to type your own. */
function Money(props: { label: string; optional?: boolean; choices: number[]; value: string; onChange: (v: string) => void; max?: number }) {
  const id = useId();
  const inList = props.value !== "" && props.choices.includes(Number(props.value));
  // Show the typing box if the user picked "Other", or if a saved amount isn't one of the choices.
  const [typing, setTyping] = useState(props.value !== "" && !inList);

  return (
    <Field id={id} label={props.label} optional={props.optional} >
      <select
        id={id}
        className={selectClass}
        value={typing ? OTHER : props.value}
        onChange={(e) => {
          const v = e.target.value;
          setTyping(v === OTHER);
          props.onChange(v === OTHER ? "" : v);
        }}
      >
        <option value="">{props.optional ? "Prefer not to say" : "Choose an amount"}</option>
        {props.choices.map((n) => (
          <option key={n} value={String(n)}>{n === 0 ? "None (₹0)" : rupees(n)}</option>
        ))}
        <option value={OTHER}>Other amount: type it</option>
      </select>
      {typing && (
        <AmountInput
          aria-label={`${props.label}: exact amount`}
          placeholder="Type the amount"
          autoFocus
          value={props.value}
          onChange={props.onChange}
          maxDigits={props.max ?? 9}
        />
      )}
    </Field>
  );
}

function Select(props: { label: string; optional?: boolean; hint?: string; options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <Field id={id} label={props.label} optional={props.optional} hint={props.hint}>
      <select id={id} className={selectClass} value={props.value} onChange={(e) => props.onChange(e.target.value)}>
        <option value="">{props.optional ? "Prefer not to say" : "Choose one"}</option>
        {props.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  );
}

/** Pick one option from tappable cards (radio buttons underneath, so keyboards and screen readers work). */
function CardChoice(props: {
  label: string;
  columns: string;
  options: { value: string; label: string; hint?: string; icon?: LucideIcon }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const name = useId();
  return (
    <fieldset className="flex flex-col gap-3 text-sm">
      <legend className="mb-3">{props.label}</legend>
      <div className={cn("grid grid-cols-2 gap-3", props.columns)}>
        {props.options.map((o) => {
          const Icon = o.icon ?? User;
          const on = props.value === o.value;
          return (
            <label key={o.value}
              className={cn(
                "relative flex cursor-pointer flex-col gap-2 rounded-2xl border p-4 transition duration-200 active:scale-[0.98]",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                on ? "border-accent bg-accent/10 shadow-glow" : "border-line bg-ink-800/50 hover:border-accent/50 hover:bg-ink-800",
              )}>
              <input type="radio" className="sr-only" name={name} value={o.value} checked={on} onChange={() => props.onChange(o.value)} />
              <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", on ? "bg-accent text-on-accent" : "bg-ink-850 text-accent")}>
                <Icon size={20} aria-hidden="true" />
              </span>
              <span className="font-semibold">{o.label}</span>
              {o.hint && <span className="text-xs text-muted">{o.hint}</span>}
              {on && <Check size={16} aria-hidden="true" className="absolute top-3 right-3 text-accent" />}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
