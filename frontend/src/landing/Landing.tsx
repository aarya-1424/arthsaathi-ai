import {
  ArrowRight, FileText, Landmark, Languages, Lock, PieChart, ShieldCheck, Sparkles, Target, TrendingUp, UserCheck, Wallet,
} from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { AuthSheet } from "../auth/AuthScreen";
import { CHART_COLOURS, Donut, Legend } from "../ui/charts";
import { Button, Card, cn, fieldClass, GlowBackground } from "../ui/components";
import { SiteFooter } from "../legal/SiteFooter";
import { Logo, LogoMark } from "../ui/Logo";
import { split503020 } from "./split";

type SheetMode = "signin" | "signup" | null;

/**
 * Public landing page: floating glass bar at the top, glowing hero, honest content.
 * No fake numbers, customer counts, testimonials or badges.
 */
export function Landing() {
  const [sheet, setSheet] = useState<SheetMode>(null);

  return (
    <div className="theme-dark relative isolate min-h-dvh overflow-x-clip">
      <GlowBackground />
      <TopBar onSignIn={() => setSheet("signin")} onStart={() => setSheet("signup")} />

      <main className="mx-auto flex max-w-6xl flex-col gap-28 px-5 pt-32 pb-20 sm:px-8 lg:pt-40">
        <Hero onStart={() => setSheet("signup")} />
        <Features />
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
    <nav aria-label="Main" className="glass fixed inset-x-3 top-3 z-30 mx-auto flex max-w-5xl items-center justify-between gap-1 rounded-full py-1.5 pr-1.5 pl-2 shadow-soft sm:top-5 sm:gap-2 sm:py-2 sm:pr-2 sm:pl-4">
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
        <Sparkles size={14} aria-hidden="true" className="text-accent" /> Your personal money companion, made for India
      </span>
      <h1 id="hero-title" className="max-w-4xl text-5xl leading-[1.05] font-semibold tracking-tight sm:text-6xl lg:text-7xl">
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
        <a href="#how" className="inline-flex min-h-12 items-center rounded-full border border-line px-6 text-sm font-semibold text-text transition hover:border-accent/50">
          See how it works
        </a>
      </div>

      {/* The light beam falling onto the app window */}
      <div aria-hidden="true" className="relative mt-10 h-40 w-full max-w-3xl">
        <div className="beam absolute inset-x-[30%] top-0 bottom-0" />
        <div className="absolute inset-x-[42%] top-0 bottom-0 bg-gradient-to-b from-accent/0 via-accent/40 to-accent/70 blur-sm" />
      </div>
      <TryIt />
    </section>
  );
}

/** A live example inside an "app window". Clearly labelled as an example, not advice. */
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
    <div className="relative -mt-2 w-full max-w-5xl rounded-[1.75rem] border border-accent/30 bg-ink-900/90 p-2 text-left shadow-[0_-20px_80px_-20px_rgb(255_106_43/0.45)]">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-sm font-semibold">Try it with your income</span>
        <span className="ml-auto rounded-full border border-line px-2.5 py-0.5 text-xs text-muted">Example</span>
      </div>
      <div className="grid gap-4 rounded-[1.4rem] border border-line bg-ink-950/60 p-5 md:grid-cols-[1fr_1.2fr] md:p-7">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5 text-sm">
            <label htmlFor={id}>Your monthly income</label>
            <span className="relative">
              <span aria-hidden="true" className="absolute top-1/2 left-3 -translate-y-1/2 text-muted">₹</span>
              <input
                id={id}
                inputMode="numeric"
                className={`${fieldClass} pl-7 text-lg font-semibold`}
                value={income}
                onChange={(e) => setIncome(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 8))}
              />
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {segments.map((seg) => (
              <div key={seg.label} className="rounded-2xl border border-line bg-ink-850 p-3 shadow-soft">
                <span aria-hidden="true" className="mb-2 block h-1.5 w-6 rounded-full" style={{ background: seg.color }} />
                <p className="text-xs text-muted">{seg.label.split(" (")[0]}</p>
                <p className="mt-0.5 font-semibold">₹{seg.value.toLocaleString("en-IN")}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted">
            This uses the common 50/30/20 starting rule, just as an example. It isn't advice. Inside ArthSaathi, plans are based on
            your real income and expenses.
          </p>
        </div>
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-line bg-ink-850 p-5 shadow-soft sm:flex-row">
          <Donut
            segments={segments}
            label="Example split of your income"
            size={176}
            thickness={22}
            center={
              <>
                <span className="text-xs text-muted">Save</span>
                <span className="text-xl font-semibold">₹{s.savings.toLocaleString("en-IN")}</span>
              </>
            }
          />
          <div className="w-full flex-1"><Legend segments={segments} /></div>
        </div>
      </div>
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
        <Tile className="md:col-span-4" icon={PieChart} title="See where your money goes">
          Record what you receive and spend. ArthSaathi shows what's left, where it went, and how this month compares with last month.
        </Tile>
        <Tile className="md:col-span-2" icon={Wallet} title="Budgets that guide you">
          Set limits per category. Bars turn yellow when you're close and red when you go over.
        </Tile>
        <Tile className="md:col-span-2" icon={TrendingUp} title="Six months at a glance">
          A simple chart of what you received and spent, month by month.
        </Tile>
        <Tile className="md:col-span-4" icon={Sparkles} title="Next steps, from your own numbers">
          Your Saathi points out what needs attention, like a budget that's almost used up, using only what you've recorded.
        </Tile>
      </div>

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

function Tile(props: { className?: string; icon: typeof Wallet; title: string; children: ReactNode }) {
  const Icon = props.icon;
  return (
    <Card interactive className={cn("flex flex-col gap-3", props.className)}>
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/12 text-accent"><Icon size={20} aria-hidden="true" /></span>
      <h3 className="text-lg font-semibold">{props.title}</h3>
      <div className="text-sm text-muted">{props.children}</div>
    </Card>
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
      <ol className="grid gap-4 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <li key={step.title}>
            <Card className="flex h-full flex-col gap-3">
              <span className="text-5xl font-semibold text-accent/80">0{i + 1}</span>
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <p className="text-sm text-muted">{step.text}</p>
            </Card>
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
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/12 text-accent"><p.icon size={20} aria-hidden="true" /></span>
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

// ---------- Closing (in place of a busy footer) ----------

function Closing({ onStart }: { onStart: () => void }) {
  return (
    <section id="begin" aria-labelledby="begin-title" className="scroll-mt-28">
      <Card variant="highlight" className="relative flex flex-col items-center gap-6 overflow-hidden px-6 py-14 text-center">
        <div aria-hidden="true" className="orb pointer-events-none absolute -bottom-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full" />
        <LogoMark size={48} className="relative" />
        <h2 id="begin-title" className="relative max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
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
    <div className="flex max-w-2xl flex-col gap-2">
      <span className="text-sm font-semibold text-accent">{kicker}</span>
      <h2 id={id} className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
    </div>
  );
}
