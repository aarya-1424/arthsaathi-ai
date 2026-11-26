import {
  ArrowRight, FileText, Landmark, Languages, Lock, PieChart, ShieldCheck, Sparkles, Target, TrendingUp, UserCheck, Wallet,
} from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { AuthSheet } from "../auth/AuthScreen";
import { SiteFooter } from "../legal/SiteFooter";
import { AreaChart, CHART_COLOURS, Donut, Legend, Sparkline } from "../ui/charts";
import { Button, Card, cn, GlowBackground, Progress } from "../ui/components";
import { AmountInput } from "../ui/fields";
import { Logo, LogoMark } from "../ui/Logo";
import { split503020 } from "./split";

type SheetMode = "signin" | "signup" | null;

/**
 * Public landing page: floating bar at the top, a hero that shows the real product, honest content.
 * No fake numbers, customer counts, testimonials or badges. Product pictures use sample numbers and say so.
 */
export function Landing() {
  const [sheet, setSheet] = useState<SheetMode>(null);

  return (
    <div className="theme-dark relative isolate min-h-dvh overflow-x-clip">
      <GlowBackground />
      <TopBar onSignIn={() => setSheet("signin")} onStart={() => setSheet("signup")} />

      <main className="mx-auto flex max-w-6xl flex-col gap-28 px-5 pt-28 pb-16 sm:px-8 lg:pt-36">
        <Hero onStart={() => setSheet("signup")} />
        <Features />
        <TryIt />
        <HowItWorks />
        <Trust />
        <Closing onStart={() => setSheet("signup")} />
        <SiteFooter />
      </main>

      {sheet && <AuthSheet initialMode={sheet} onClose={() => setSheet(null)} />}
    </div>
  );
}

// ---------- Floating top bar ----------

function TopBar({ onSignIn, onStart }: { onSignIn: () => void; onStart: () => void }) {
  const link = "hidden min-h-10 items-center rounded-full px-4 text-sm text-muted transition hover:bg-ink-800 hover:text-text md:inline-flex";
  return (
    <nav aria-label="Main" className="topbar fixed inset-x-3 top-3 z-30 mx-auto flex max-w-5xl items-center justify-between gap-1 rounded-full py-1.5 pr-1.5 pl-2 shadow-soft sm:top-5 sm:gap-2 sm:py-2 sm:pr-2 sm:pl-4">
      <a href="#start" aria-label="ArthSaathi, back to top" className="shrink-0 rounded-full"><Logo size={32} /></a>
      <div className="flex items-center">
        <a href="#features" className={link}>Features</a>
        <a href="#how" className={link}>How it works</a>
        <a href="#trust" className={link}>Trust</a>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" onClick={onSignIn} className="px-3 sm:px-4">Sign in</Button>
        <Button variant="primary" onClick={onStart} className="px-4">Get started</Button>
      </div>
    </nav>
  );
}

// ---------- Hero ----------

function Hero({ onStart }: { onStart: () => void }) {
  return (
    <section id="start" aria-labelledby="hero-title" className="relative flex scroll-mt-32 flex-col items-center text-center">
      <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-ink-850/80 px-4 py-1.5 text-xs text-muted">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" /> Your personal money companion, made for India
      </span>
      <h1 id="hero-title" className="max-w-4xl text-5xl leading-[1.04] font-semibold sm:text-6xl lg:text-[5.25rem]">
        Your money,{" "}
        <span className="bg-gradient-to-r from-accent via-[#ff9a63] to-[#ffc9a8] bg-clip-text text-transparent">finally understood.</span>
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-muted">
        See where your money goes, plan what matters, and learn as you go, in simple English and Hindi. Made for earners,
        families and students.
      </p>
      <p lang="hi" className="mt-2 text-muted">आपका पैसा, आपकी समझ।</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button variant="primary" onClick={onStart} className="min-h-12 px-7 text-base">
          Get started <ArrowRight size={18} aria-hidden="true" />
        </Button>
        <a href="#how" className="inline-flex min-h-12 items-center rounded-full border border-line px-6 text-sm font-semibold text-text transition hover:border-line-strong hover:bg-ink-850">
          See how it works
        </a>
      </div>
      <p className="mt-4 text-sm text-muted">Free to use. No bank login needed.</p>
      <ProductPreview />
    </section>
  );
}

const SAMPLE_MONTHS = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
const SAMPLE_RECEIVED = [28000, 32500, 28000, 30500, 34000, 31000];
const SAMPLE_SPENT = [19600, 20400, 20900, 18900, 19600, 22800];
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/**
 * A picture of the real dashboard, built from the app's own pieces and filled with sample numbers.
 * It is a picture only: screen readers get one description, and it can't be clicked or focused.
 */
function ProductPreview() {
  return (
    <figure className="relative mt-14 w-full max-w-5xl text-left">
      <div aria-hidden="true" className="hero-glow pointer-events-none absolute inset-x-[8%] -top-16 -z-10 h-72" />
      <div role="img" aria-label="Example of the ArthSaathi dashboard, with sample numbers: money left this month, a six-month chart, budgets and next steps."
        className="fade-bottom rounded-[1.75rem] border border-line-strong bg-ink-900 p-3 shadow-lift sm:p-4">
        <div aria-hidden="true" inert className="grid max-h-[30rem] gap-3 overflow-hidden sm:gap-4 lg:grid-cols-[1.7fr_1fr]">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
              <div className="card-highlight rounded-card p-4">
                <p className="text-xs text-muted">Left this month</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">{inr(8200)}</p>
                <p className="mt-1 text-xs text-success">You kept 26.5%</p>
              </div>
              <PreviewStat label="Received" value={inr(31000)} />
              <PreviewStat label="Spent" value={inr(22800)} />
            </div>
            <div className="rounded-card border border-line bg-ink-850 p-4">
              <p className="mb-2 text-sm font-semibold">Last 6 months</p>
              <AreaChart
                label="Sample chart"
                labels={SAMPLE_MONTHS}
                height={210}
                series={[
                  { label: "Received", color: "#ff6a2b", values: SAMPLE_RECEIVED },
                  { label: "Spent", color: "#d6d3ce", values: SAMPLE_SPENT },
                ]}
              />
            </div>
          </div>
          <div className="hidden flex-col gap-4 lg:flex">
            <div className="rounded-card border border-line bg-ink-850 p-4">
              <p className="mb-3 text-sm font-semibold">Budget</p>
              <BudgetVisual />
            </div>
            <div className="rounded-card border border-line bg-ink-850 p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><Sparkles size={15} className="text-accent" />Your Saathi</p>
              <StepsVisual />
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-2 text-center text-xs text-muted">A look at the dashboard, shown with sample numbers.</figcaption>
    </figure>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-line bg-ink-850 p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

// ---------- Small product pictures (sample numbers) ----------

const SAMPLE_BUDGETS = [
  { label: "Transport", spent: 1500, limit: 3000, status: "ok" as const, note: "On track" },
  { label: "Food", spent: 4500, limit: 5000, status: "near" as const, note: "Close to limit" },
  { label: "Shopping", spent: 3800, limit: 3000, status: "over" as const, note: "Over limit" },
];
const NOTE_COLOUR = { ok: "text-success", near: "text-warn", over: "text-danger" };

function BudgetVisual() {
  return (
    <div className="flex flex-col gap-3">
      {SAMPLE_BUDGETS.map((b) => (
        <div key={b.label} className="flex flex-col gap-1.5 text-xs">
          <div className="flex justify-between gap-2">
            <span>{b.label}</span>
            <span className={NOTE_COLOUR[b.status]}>{b.note}</span>
          </div>
          <Progress value={b.spent} max={b.limit} status={b.status} label={`Example: ${b.label} budget`} />
        </div>
      ))}
    </div>
  );
}

function StepsVisual() {
  const rows = [
    { tone: "bg-danger", text: "You're over your Shopping budget by ₹800" },
    { tone: "bg-warn", text: "Your Food budget is almost used: ₹500 left" },
  ];
  return (
    <ul className="flex flex-col gap-2 text-xs">
      {rows.map((r) => (
        <li key={r.text} className="flex items-center gap-2.5 rounded-xl border border-line bg-ink-800/60 px-3 py-2.5">
          <span aria-hidden="true" className={cn("h-2 w-2 shrink-0 rounded-full", r.tone)} />
          {r.text}
        </li>
      ))}
    </ul>
  );
}

function SpendingVisual() {
  const segments = [
    { label: "Rent", value: 8000, color: CHART_COLOURS[0] },
    { label: "Family", value: 5000, color: CHART_COLOURS[1] },
    { label: "Food", value: 4500, color: CHART_COLOURS[2] },
    { label: "Other", value: 5300, color: CHART_COLOURS[3] },
  ];
  return (
    <div className="flex items-center gap-5">
      <Donut segments={segments} label="Example spending split" size={112} thickness={15} />
      <ul className="flex flex-col gap-1.5 text-xs text-muted">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Features: what works today first, then what is on the way ----------

const ON_THE_WAY = [
  { icon: Target, title: "Goals", text: "See how much to save each month and when you'll get there." },
  { icon: Languages, title: "Ask in Hindi or English", text: "Ask money questions in English, Hindi or Hinglish." },
  { icon: FileText, title: "Documents explained", text: "Understand a salary slip or Form 16, only if you choose to upload it." },
  { icon: Landmark, title: "Government schemes", text: "Find schemes you may be eligible for, with official sources." },
];

function Features() {
  return (
    <section id="features" aria-labelledby="features-title" className="flex scroll-mt-28 flex-col gap-8">
      <SectionTitle id="features-title" kicker="What it does" title="Everything about your money, in one calm place" />
      <div className="grid gap-4 md:grid-cols-6">
        <Tile wide className="md:col-span-4" icon={PieChart} title="See where your money goes" visual={<SpendingVisual />}>
          Record what you receive and spend. ArthSaathi shows what's left, where it went, and how this month compares with last month.
        </Tile>
        <Tile className="md:col-span-2" icon={Wallet} title="Budgets that guide you" visual={<BudgetVisual />}>
          Set limits per category. Bars turn yellow when you're close and red when you go over.
        </Tile>
        <Tile className="md:col-span-2" icon={TrendingUp} title="Six months at a glance" visual={<Sparkline values={SAMPLE_RECEIVED} width={220} height={56} />}>
          A simple chart of what you received and spent, month by month.
        </Tile>
        <Tile wide className="md:col-span-4" icon={Sparkles} title="Next steps, from your own numbers" visual={<StepsVisual />}>
          Your Saathi points out what needs attention, like a budget that's almost used up, using only what you've recorded.
        </Tile>
      </div>
      <p className="-mt-4 text-xs text-muted">The small pictures show sample numbers.</p>

      <div aria-labelledby="soon-title" role="group" className="flex flex-col gap-4 rounded-card border border-dashed border-line p-5">
        <h3 id="soon-title" className="text-sm font-semibold text-muted">On the way</h3>
        <ul className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          {ON_THE_WAY.map((f) => (
            <li key={f.title} className="flex gap-3 text-sm">
              <f.icon size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-muted" />
              <span className="flex flex-col gap-0.5">
                <span className="font-semibold">{f.title}</span>
                <span className="text-xs text-muted">{f.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function IconBox({ icon: Icon }: { icon: typeof Wallet }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-ink-800 text-text">
      <Icon size={18} aria-hidden="true" />
    </span>
  );
}

function Tile(props: { className?: string; wide?: boolean; icon: typeof Wallet; title: string; visual: ReactNode; children: ReactNode }) {
  return (
    <Card interactive className={cn("flex flex-col gap-6 hover:border-line-strong", props.wide && "md:flex-row md:items-center md:justify-between", props.className)}>
      {/* Icon at the top, words at the bottom: fills tall tiles without an empty gap */}
      <div className={cn("flex flex-col gap-6", props.wide && "md:max-w-sm md:self-stretch md:justify-between")}>
        <IconBox icon={props.icon} />
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-semibold">{props.title}</h3>
          <p className="text-sm text-muted">{props.children}</p>
        </div>
      </div>
      <div className={cn("rounded-2xl border border-line bg-ink-900 p-4", props.wide ? "md:w-72 md:shrink-0" : "mt-auto")}>{props.visual}</div>
    </Card>
  );
}

// ---------- Try it: a live example the visitor can play with ----------

function TryIt() {
  const id = useId();
  const [income, setIncome] = useState("28000");
  const s = split503020(Number(income || 0));
  const segments = [
    { label: "Needs (rent, food, bills)", value: s.needs, color: CHART_COLOURS[0] },
    { label: "Wants (outings, shopping)", value: s.wants, color: CHART_COLOURS[1] },
    { label: "Savings", value: s.savings, color: CHART_COLOURS[2] },
  ];

  return (
    <section id="try" aria-labelledby="try-title" className="flex scroll-mt-28 flex-col gap-8">
      <SectionTitle id="try-title" kicker="Try it" title="Type your income and see a simple starting plan" />
      <Card className="grid gap-5 p-5 md:grid-cols-[1fr_1.2fr] md:p-7">
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor={id} className="text-sm">Your monthly income</label>
            <span className="rounded-full border border-line px-2.5 py-0.5 text-xs text-muted">Example</span>
          </div>
          <div className="-mt-3">
            <AmountInput id={id} value={income} onChange={setIncome} maxDigits={8} className="text-lg font-semibold" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {segments.map((seg) => (
              <div key={seg.label} className="rounded-2xl border border-line bg-ink-800/60 p-3">
                <span aria-hidden="true" className="mb-2 block h-1.5 w-6 rounded-full" style={{ background: seg.color }} />
                <p className="text-xs text-muted">{seg.label.split(" (")[0]}</p>
                <p className="mt-0.5 font-semibold">{inr(seg.value)}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted">
            This uses the common 50/30/20 starting rule, just as an example. It isn't advice. Inside ArthSaathi, plans are based on
            your real income and expenses.
          </p>
        </div>
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-line bg-ink-900 p-5 sm:flex-row">
          <Donut
            segments={segments}
            label="Example split of your income"
            size={176}
            thickness={22}
            center={
              <>
                <span className="text-xs text-muted">Save</span>
                <span className="text-xl font-semibold">{inr(s.savings)}</span>
              </>
            }
          />
          <div className="w-full flex-1"><Legend segments={segments} /></div>
        </div>
      </Card>
    </section>
  );
}

// ---------- How it works ----------

const STEPS = [
  { title: "Tell us a little", text: "A few quick questions about your income, expenses and goals. Skip what you don't want to share." },
  { title: "Record what comes and goes", text: "Add money you receive and spend. Rough amounts are fine. No bank login needed." },
  { title: "See clearly, plan ahead", text: "Charts and simple words show where you stand, and what a good next step could be." },
];

function HowItWorks() {
  return (
    <section id="how" aria-labelledby="how-title" className="flex scroll-mt-28 flex-col gap-10">
      <SectionTitle id="how-title" kicker="How it works" title="Three small steps" />
      <ol className="grid gap-x-10 gap-y-8 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex flex-col gap-3 border-t border-line pt-5">
            <span className="text-sm font-semibold text-muted">Step {i + 1}</span>
            <h3 className="text-xl font-semibold">{step.title}</h3>
            <p className="text-sm text-muted">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ---------- Trust ----------

const PROMISES = [
  { icon: Lock, title: "We never ask for secrets", text: "No bank passwords, UPI PIN, OTP or card PIN. Ever." },
  { icon: ShieldCheck, title: "Your data is yours", text: "Only you can see your money details. They're never sold, and you can delete them." },
  { icon: FileText, title: "Documents are optional", text: "Upload only if you want to. Delete them whenever you like." },
  { icon: UserCheck, title: "Honest guidance", text: "We explain and show our maths. We're not a registered advisor and don't sell products." },
];

function Trust() {
  return (
    <section id="trust" aria-labelledby="trust-title" className="flex scroll-mt-28 flex-col gap-8">
      <SectionTitle id="trust-title" kicker="Built on trust" title="Your money is personal. We treat it that way." />
      <ul className="grid gap-4 sm:grid-cols-2">
        {PROMISES.map((p) => (
          <li key={p.title}>
            <Card className="flex h-full gap-4">
              <IconBox icon={p.icon} />
              <span className="flex flex-col gap-1">
                <span className="font-semibold">{p.title}</span>
                <span className="text-sm text-muted">{p.text}</span>
              </span>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------- Closing ----------

function Closing({ onStart }: { onStart: () => void }) {
  return (
    <section id="begin" aria-labelledby="begin-title" className="scroll-mt-28">
      <Card variant="highlight" className="relative flex flex-col items-center gap-6 overflow-hidden px-6 py-16 text-center">
        <LogoMark size={48} className="relative" />
        <h2 id="begin-title" className="relative max-w-2xl text-3xl font-semibold sm:text-5xl">
          Start understanding your money today
        </h2>
        <Button variant="primary" onClick={onStart} className="relative min-h-12 px-7 text-base">
          Get started <ArrowRight size={18} aria-hidden="true" />
        </Button>
        <p className="relative text-sm text-muted">Free to use. No bank login needed.</p>
      </Card>
    </section>
  );
}

function SectionTitle({ id, kicker, title }: { id: string; kicker: string; title: string }) {
  return (
    <div className="flex max-w-2xl flex-col gap-3">
      <span className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-muted uppercase">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />{kicker}
      </span>
      <h2 id={id} className="text-3xl font-semibold sm:text-[2.75rem] sm:leading-[1.1]">{title}</h2>
    </div>
  );
}
