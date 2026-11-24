import { Home, MessageCircle, Sparkles, Target, User, Wallet } from "lucide-react";
import { useState } from "react";
import { AppShell } from "../ui/AppShell";
import { Button, Card, Chip, CountUpRupees, fieldClass, Progress } from "../ui/components";
import { colors, contrastRatio } from "../ui/tokens";

/**
 * Design preview (development only). Open http://localhost:5173/#/design
 * All numbers here are SAMPLE numbers for showing the design. They are never shown to real users.
 */
const NAV = [
  { id: "home", label: "Home", icon: Home },
  { id: "money", label: "My Money", icon: Wallet },
  { id: "goals", label: "Goals", icon: Target },
  { id: "profile", label: "Profile", icon: User },
];
const ASK = { id: "ask", label: "Ask ArthSaathi", icon: MessageCircle };

const SWATCHES: { name: string; hex: string; on?: string }[] = [
  { name: "Page", hex: colors.ink950 },
  { name: "Card", hex: colors.ink850 },
  { name: "Raised", hex: colors.ink800 },
  { name: "Border", hex: colors.line },
  { name: "Text", hex: colors.text, on: colors.ink950 },
  { name: "Muted", hex: colors.muted, on: colors.ink950 },
  { name: "Mint accent", hex: colors.mint, on: colors.ink950 },
  { name: "Warning", hex: colors.warn, on: colors.ink850 },
  { name: "Danger", hex: colors.danger, on: colors.ink850 },
];

export function DesignPreview() {
  const [active, setActive] = useState("home");
  const [chip, setChip] = useState("month");
  const [amount, setAmount] = useState("");
  const [showError, setShowError] = useState(false);

  return (
    <AppShell items={NAV} ask={ASK} active={active} onNavigate={setActive} side={<SaathiPanel />}>
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-1">
          <span className="w-fit rounded-full border border-line px-3 py-1 text-xs text-muted">Design preview · sample numbers</span>
          <p className="mt-3 text-sm text-muted">Good evening</p>
          <h1 className="text-3xl font-semibold tracking-tight">Rahul</h1>
          <p className="text-muted">Let's make your money work better for you.</p>
          <p className="text-muted" lang="hi">आपका पैसा, आपकी समझ।</p>
        </header>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Period">
          {[["month", "This month"], ["budget", "Budget"], ["goals", "Goals"]].map(([id, label]) => (
            <Chip key={id} selected={chip === id} onClick={() => setChip(id)}>{label}</Chip>
          ))}
        </div>

        <section aria-label="Cards" className="grid gap-4 sm:grid-cols-2">
          <Card variant="highlight" className="sm:col-span-2">
            <p className="text-sm text-muted">Left this month</p>
            <CountUpRupees value={14000} className="mt-1 block text-4xl font-semibold tracking-tight" />
            <p className="mt-2 text-sm text-mint">You kept 50% of what you received</p>
          </Card>
          <Card interactive>
            <p className="text-sm text-muted">Received</p>
            <p className="mt-1 text-2xl font-semibold">₹28,000</p>
            <p className="mt-1 text-xs text-muted">Hover me on a computer, or tap on a phone</p>
          </Card>
          <Card interactive>
            <p className="text-sm text-muted">Spent</p>
            <p className="mt-1 text-2xl font-semibold">₹14,000</p>
            <p className="mt-1 text-xs text-muted">₹4,000 more than last month</p>
          </Card>
        </section>

        <section aria-label="Budget" className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Budget</h2>
          <Card className="flex flex-col gap-5">
            <BudgetRow label="Transport" spent={1500} limit={3000} status="ok" />
            <BudgetRow label="Food" spent={4500} limit={5000} status="near" />
            <BudgetRow label="Shopping" spent={3800} limit={3000} status="over" />
          </Card>
        </section>

        <section aria-label="Glass" className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Glass card</h2>
          <Card variant="glass">
            <p className="font-medium">Frosted glass over the soft green glow</p>
            <p className="mt-1 text-sm text-muted">
              Used only for the rail, dock, Saathi panel and pop-ups. On phones that can't handle blur, it turns into a solid card automatically.
            </p>
          </Card>
        </section>

        <section aria-label="Buttons" className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Buttons</h2>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary">Add entry</Button>
            <Button>Set budget</Button>
            <Button variant="ghost">Cancel</Button>
            <Button variant="danger">Delete</Button>
            <Button variant="primary" disabled>Saving...</Button>
          </div>
        </section>

        <section aria-label="Form" className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Form fields</h2>
          <Card className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span>Amount</span>
              <span className="relative">
                <span aria-hidden="true" className="absolute top-1/2 left-3 -translate-y-1/2 text-muted">₹</span>
                <input
                  className={`${fieldClass} pl-7`}
                  inputMode="numeric"
                  placeholder="5,000"
                  value={amount}
                  aria-invalid={showError}
                  onChange={(e) => { setAmount(e.target.value.replace(/\D/g, "")); setShowError(false); }}
                />
              </span>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span>Category</span>
              <select className={fieldClass} defaultValue="">
                <option value="">Choose one</option>
                <option>Food</option>
                <option>Rent</option>
              </select>
            </label>
            {showError && <p role="alert" className="text-sm text-danger">Enter an amount more than ₹0.</p>}
            <Button variant="primary" onClick={() => setShowError(!amount)}>Save</Button>
          </Card>
        </section>

        <section aria-label="Colours" className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Colours</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {SWATCHES.map((s) => (
              <div key={s.name} className="flex flex-col gap-1.5 text-xs">
                <span className="h-12 rounded-xl border border-line" style={{ background: s.hex }} />
                <span>{s.name}</span>
                <span className="text-muted">{s.hex}</span>
                {s.on && <span className="text-muted">Contrast {contrastRatio(s.hex, s.on).toFixed(1)}:1</span>}
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function BudgetRow({ label, spent, limit, status }: { label: string; spent: number; limit: number; status: "ok" | "near" | "over" }) {
  const text = { ok: "On track", near: "Close to limit", over: "Over limit" }[status];
  const colour = { ok: "text-mint", near: "text-warn", over: "text-danger" }[status];
  const left = limit - spent;
  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex justify-between">
        <span>{label}</span>
        <span className="text-muted">₹{spent.toLocaleString("en-IN")} of ₹{limit.toLocaleString("en-IN")}</span>
      </div>
      <Progress value={spent} max={limit} status={status} label={`${label} budget used`} />
      <span className={`text-xs ${colour}`}>
        {text} · {left >= 0 ? `₹${left.toLocaleString("en-IN")} left` : `₹${(-left).toLocaleString("en-IN")} over`}
      </span>
    </div>
  );
}

function SaathiPanel() {
  return (
    <Card variant="glass" className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-mint/15 text-mint"><Sparkles size={18} aria-hidden="true" /></span>
        <div>
          <p className="font-semibold">Your Saathi</p>
          <p className="text-xs text-muted">Next steps for you</p>
        </div>
      </div>
      <ul className="flex flex-col gap-2 text-sm">
        {["Create an emergency fund goal", "Review your food spending", "Ask a question about SIPs"].map((t) => (
          <li key={t}>
            <button type="button" className="w-full rounded-xl border border-line px-3 py-2.5 text-left transition hover:border-mint/40 hover:bg-ink-800 active:scale-[0.99]">
              {t}
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
