import {
  ArrowRight, FileText, Landmark, Languages, Lock, PieChart, ShieldCheck, Target, UserCheck, Wallet,
} from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";
import { AuthSheet } from "../auth/AuthScreen";
import { Donut, Legend } from "../ui/charts";
import { Button, Card, cn, fieldClass, GlowBackground } from "../ui/components";
import { Logo, LogoMark } from "../ui/Logo";
import { split503020 } from "./split";

const CHAPTERS = [
  { id: "start", label: "Start" },
  { id: "features", label: "What it does" },
  { id: "how", label: "How it works" },
  { id: "trust", label: "Trust" },
  { id: "begin", label: "Begin" },
];

type SheetMode = "signin" | "signup" | null;

/**
 * Public landing page. No usual top bar, header or footer:
 * navigation lives in a floating pill at the bottom, and section dots on the right (computer).
 * No fake numbers, customer counts, testimonials or badges.
 */
export function Landing() {
  const [sheet, setSheet] = useState<SheetMode>(null);

  return (
    <div className="theme-dark relative isolate min-h-dvh overflow-x-clip">
      <GlowBackground />
      <ChapterDots />

      <main className="mx-auto flex max-w-6xl flex-col gap-28 px-5 pt-10 pb-40 sm:px-8 lg:pt-16">
        <Hero onStart={() => setSheet("signup")} />
        <Features />
        <HowItWorks />
        <Trust />
        <Closing onStart={() => setSheet("signup")} />
      </main>

      <FloatingPill onSignIn={() => setSheet("signin")} onStart={() => setSheet("signup")} />
      {sheet && <AuthSheet initialMode={sheet} onClose={() => setSheet(null)} />}
    </div>
  );
}

// ---------- Hero ----------

function Hero({ onStart }: { onStart: () => void }) {
  return (
    <section id="start" aria-labelledby="hero-title" className="relative grid scroll-mt-10 items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
      <div aria-hidden="true" className="orb pointer-events-none absolute -top-24 -left-24 -z-10 h-[30rem] w-[30rem] rounded-full" />
      <div className="flex flex-col gap-6">
        <Logo size={36} />
        <h1 id="hero-title" className="text-5xl leading-[1.05] font-semibold tracking-tight sm:text-6xl lg:text-7xl">
          Your money,
          <br />
          <span className="text-mint">finally understood.</span>
        </h1>
        <p className="max-w-xl text-lg text-muted">
          ArthSaathi is a friendly money companion for Indian earners, families and students. See where your money goes,
          plan what matters, and learn as you go, in simple English and Hindi.
        </p>
        <p lang="hi" className="text-muted">आपका पैसा, आपकी समझ।</p>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" onClick={onStart} className="px-6">
            Get started <ArrowRight size={18} aria-hidden="true" />
          </Button>
          <a href="#how" className="inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold text-muted transition hover:text-text">
            See how it works
          </a>
        </div>
      </div>
      <TryIt />
    </section>
  );
}

/** A live example the visitor can play with. Clearly labelled as an example, not advice. */
function TryIt() {
  const id = useId();
  const [income, setIncome] = useState("28000");
  const s = split503020(Number(income || 0));
  const segments = [
    { label: "Needs (rent, food, bills)", value: s.needs },
    { label: "Wants (outings, shopping)", value: s.wants },
    { label: "Savings", value: s.savings },
  ];

  return (
    <Card variant="glass" className="flex flex-col gap-5 p-6">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Try it</p>
        <span className="rounded-full border border-line px-2.5 py-0.5 text-xs text-muted">Example</span>
      </div>
      <div className="flex flex-col gap-1.5 text-sm">
        <label htmlFor={id}>Your monthly income</label>
        <span className="relative">
          <span aria-hidden="true" className="absolute top-1/2 left-3 -translate-y-1/2 text-muted">₹</span>
          <input
            id={id}
            inputMode="numeric"
            className={`${fieldClass} pl-7`}
            value={income}
            onChange={(e) => setIncome(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 8))}
          />
        </span>
      </div>
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <Donut
          segments={segments}
          label="Example split of your income"
          size={168}
          thickness={20}
          center={
            <>
              <span className="text-xs text-muted">Save</span>
              <span className="text-xl font-semibold">₹{s.savings.toLocaleString("en-IN")}</span>
            </>
          }
        />
        <div className="w-full flex-1"><Legend segments={segments} /></div>
      </div>
      <p className="text-xs text-muted">
        This uses the common 50/30/20 starting rule, just as an example. It isn't advice. Inside ArthSaathi, plans are based on
        your real income and expenses.
      </p>
    </Card>
  );
}

// ---------- Features (bento tiles of different sizes) ----------

function Features() {
  return (
    <section id="features" aria-labelledby="features-title" className="flex scroll-mt-10 flex-col gap-8">
      <SectionTitle id="features-title" kicker="What it does" title="Everything about your money, in one calm place" />
      <div className="grid gap-4 md:grid-cols-6">
        <Tile className="md:col-span-4" icon={PieChart} title="See where your money goes" status="now">
          Record what you receive and spend. ArthSaathi shows what's left, where it went, and how this month compares with last month.
        </Tile>
        <Tile className="md:col-span-2" icon={Wallet} title="Budgets that guide you" status="now">
          Set limits per category. Bars turn amber when you're close and red when you go over.
        </Tile>
        <Tile className="md:col-span-2" icon={Target} title="Goals you can reach" status="soon">
          A laptop, an emergency fund, college fees. See how much to save each month and when you'll get there.
        </Tile>
        <Tile className="md:col-span-4" icon={Languages} title="Ask in English, Hindi or Hinglish" status="soon">
          <span className="mt-4 flex flex-col gap-2 text-sm">
            <span className="w-fit max-w-[85%] self-end rounded-2xl rounded-br-md bg-mint/15 px-3 py-2 text-text">
              Mujhe ek saal mein ₹50,000 bachane hain. Kaise?
            </span>
            <span className="w-fit max-w-[85%] rounded-2xl rounded-bl-md border border-line bg-ink-800 px-3 py-2 text-text">
              That's about ₹4,167 a month. Let's look at your expenses and find it together.
            </span>
            <span className="text-xs text-muted">Example conversation</span>
          </span>
        </Tile>
        <Tile className="md:col-span-3" icon={FileText} title="Documents, explained simply" status="soon">
          Upload a salary slip or Form 16 only if you want to. We explain each line in plain words. You can delete it any time.
        </Tile>
        <Tile className="md:col-span-3" icon={Landmark} title="Government schemes for you" status="soon">
          Find schemes you may be eligible for, with official sources and the date we last checked them.
        </Tile>
      </div>
    </section>
  );
}

function Tile(props: { className?: string; icon: typeof Wallet; title: string; status: "now" | "soon"; children: ReactNode }) {
  const Icon = props.icon;
  return (
    <Card interactive className={cn("flex flex-col gap-3", props.className)}>
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-mint/12 text-mint"><Icon size={20} aria-hidden="true" /></span>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs", props.status === "now" ? "bg-mint/15 text-mint" : "border border-line text-muted")}>
          {props.status === "now" ? "Available now" : "Coming soon"}
        </span>
      </div>
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
    <section id="how" aria-labelledby="how-title" className="flex scroll-mt-10 flex-col gap-10">
      <SectionTitle id="how-title" kicker="How it works" title="Three small steps" />
      <ol className="relative grid gap-8 md:grid-cols-3">
        <span aria-hidden="true" className="absolute top-5 right-[16%] left-[16%] hidden h-px bg-gradient-to-r from-mint/0 via-mint/60 to-mint/0 md:block" />
        {STEPS.map((step, i) => (
          <li key={step.title} className="relative flex flex-col gap-3 md:items-center md:text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-mint/50 bg-ink-950 font-semibold text-mint shadow-glow">
              {i + 1}
            </span>
            <h3 className="text-lg font-semibold">{step.title}</h3>
            <p className="max-w-xs text-sm text-muted">{step.text}</p>
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
    <section id="trust" aria-labelledby="trust-title" className="flex scroll-mt-10 flex-col gap-8">
      <SectionTitle id="trust-title" kicker="Built on trust" title="Your money is personal. We treat it that way." />
      <ul className="grid gap-4 sm:grid-cols-2">
        {PROMISES.map((p) => (
          <li key={p.title}>
            <Card className="flex h-full gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint/12 text-mint"><p.icon size={20} aria-hidden="true" /></span>
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

// ---------- Closing (replaces the usual footer) ----------

function Closing({ onStart }: { onStart: () => void }) {
  return (
    <section id="begin" aria-labelledby="begin-title" className="scroll-mt-10">
      <Card variant="highlight" className="relative flex flex-col items-center gap-6 overflow-hidden px-6 py-14 text-center">
        <div aria-hidden="true" className="orb pointer-events-none absolute -bottom-40 left-1/2 -z-0 h-80 w-80 -translate-x-1/2 rounded-full" />
        <LogoMark size={48} className="relative" />
        <h2 id="begin-title" className="relative max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Start understanding your money today
        </h2>
        <Button variant="primary" onClick={onStart} className="relative px-6">
          Get started <ArrowRight size={18} aria-hidden="true" />
        </Button>
        <p className="relative max-w-2xl text-xs text-muted">
          ArthSaathi is an educational and planning tool. It is not a registered investment adviser, chartered accountant, bank
          or government body. For big financial decisions, please check with a qualified professional.
        </p>
        <p className="relative text-xs text-muted">© {new Date().getFullYear()} ArthSaathi</p>
      </Card>
    </section>
  );
}

// ---------- Navigation: floating pill + section dots ----------

function FloatingPill({ onSignIn, onStart }: { onSignIn: () => void; onStart: () => void }) {
  return (
    <nav aria-label="Main" className="glass fixed inset-x-3 bottom-4 z-30 mx-auto flex max-w-fit items-center gap-1 rounded-full p-1.5 pl-2 sm:gap-2">
      <a href="#start" aria-label="ArthSaathi, back to top" className="mr-1 rounded-full"><LogoMark size={34} /></a>
      <a href="#features" className="hidden min-h-11 items-center rounded-full px-3 text-sm text-muted transition hover:text-text md:inline-flex">Features</a>
      <a href="#how" className="hidden min-h-11 items-center rounded-full px-3 text-sm text-muted transition hover:text-text md:inline-flex">How it works</a>
      <a href="#trust" className="hidden min-h-11 items-center rounded-full px-3 text-sm text-muted transition hover:text-text md:inline-flex">Trust</a>
      <Button variant="ghost" onClick={onSignIn}>Sign in</Button>
      <Button variant="primary" onClick={onStart}>Get started</Button>
    </nav>
  );
}

function ChapterDots() {
  const [active, setActive] = useState("start");
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-45% 0px -50% 0px" },
    );
    CHAPTERS.forEach((c) => {
      const el = document.getElementById(c.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <nav aria-label="Page sections" className="fixed top-1/2 right-5 z-20 hidden -translate-y-1/2 flex-col gap-3 xl:flex">
      {CHAPTERS.map((c) => (
        <a key={c.id} href={`#${c.id}`} aria-label={c.label} aria-current={active === c.id ? "true" : undefined} className="group flex items-center justify-end gap-3">
          <span className="text-xs text-muted opacity-0 transition group-hover:opacity-100">{c.label}</span>
          <span className={cn("block rounded-full transition-all", active === c.id ? "h-6 w-1.5 bg-mint" : "h-1.5 w-1.5 bg-muted/60 group-hover:bg-text")} />
        </a>
      ))}
    </nav>
  );
}

function SectionTitle({ id, kicker, title }: { id: string; kicker: string; title: string }) {
  return (
    <div className="flex max-w-2xl flex-col gap-2">
      <span className="text-sm font-semibold text-mint">{kicker}</span>
      <h2 id={id} className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
    </div>
  );
}
