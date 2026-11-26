import { Home as HomeIcon, LogOut, Pencil, Plus, User, Wallet } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { HomePage } from "../home/HomePage";
import { SaathiPanel } from "../home/SaathiPanel";
import { api, ApiError } from "../lib/api";
import { supabase } from "../lib/supabase";
import { MoneyPage } from "../money/MoneyPage";
import { ProfileWizard } from "../profile/ProfileWizard";
import { AGE_RANGES, GOALS, INCOME_SOURCES, KNOWLEDGE_LEVELS, OCCUPATIONS, rupees, type Profile } from "../profile/types";
import { AppShell } from "../ui/AppShell";
import { Button, Card } from "../ui/components";
import { LogoMark } from "../ui/Logo";
import { FullScreen } from "./FullScreen";

/**
 * Everything a signed-in user sees. Loaded only after sign-in, so the landing page stays light.
 * Pages have real addresses: /  /money  /profile  /profile/edit
 * (Goals and Ask ArthSaathi join the menu when they are built.)
 */
const NAV = [
  { to: "/", label: "Home", icon: HomeIcon },
  { to: "/money", label: "My Money", icon: Wallet },
  { to: "/profile", label: "Profile", icon: User },
];

const PATHS = { money: "/money", profile: "/profile" } as const;

function label(list: { value: string; label: string }[], value: string | null): string | null {
  return value ? list.find((o) => o.value === value)?.label ?? value : null;
}

function ProfilePage({ profile, onEdit }: { profile: Profile; onEdit: () => void }) {
  const { session } = useAuth();
  const f = profile.financial!;
  const rows: [string, string | null][] = [
    ["Name", profile.display_name],
    ["Email", session?.user.email ?? null],
    ["Occupation", label(OCCUPATIONS, f.occupation)],
    ["Age range", label(AGE_RANGES, f.age_range)],
    ["State", f.state],
    ["Monthly income", rupees(f.monthly_income)],
    ["Income from", label(INCOME_SOURCES, f.income_source)],
    ["Monthly expenses", rupees(f.monthly_expenses)],
    ["Monthly savings", f.monthly_savings !== null ? rupees(f.monthly_savings) : null],
    ["Loan EMIs", f.monthly_emi !== null ? rupees(f.monthly_emi) : null],
    ["Dependents", f.dependents !== null ? String(f.dependents) : null],
    ["Emergency savings", f.emergency_fund !== null ? rupees(f.emergency_fund) : null],
    ["Comfort with money", label(KNOWLEDGE_LEVELS, f.knowledge_level)],
  ];
  const goals = f.goals.map((g) => (g === "other" && f.other_goal ? f.other_goal : label(GOALS, g)));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">Your profile</h1>
      <Card className="flex flex-col gap-1">
        <dl className="grid gap-x-6 sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 border-b border-line py-3 text-sm">
              <dt className="text-muted">{k}</dt>
              <dd className="text-right">{v ?? <span className="text-muted">Not shared</span>}</dd>
            </div>
          ))}
        </dl>
        {goals.length > 0 && (
          <div className="pt-3 text-sm">
            <p className="mb-2 text-muted">Goals</p>
            <div className="flex flex-wrap gap-2">
              {goals.map((g) => <span key={g} className="rounded-full bg-accent/12 px-3 py-1 text-accent">{g}</span>)}
            </div>
          </div>
        )}
      </Card>
      <div className="flex flex-wrap gap-3">
        <Button variant="primary" onClick={onEdit}><Pencil size={16} aria-hidden="true" />Edit my profile</Button>
        <Button variant="ghost" onClick={() => supabase.auth.signOut()}><LogOut size={16} aria-hidden="true" />Sign out</Button>
      </div>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <Link to="/privacy" className="underline-offset-4 hover:text-text hover:underline">Privacy</Link>
        <Link to="/terms" className="underline-offset-4 hover:text-text hover:underline">Terms</Link>
        <Link to="/disclaimer" className="underline-offset-4 hover:text-text hover:underline">Disclaimer</Link>
      </p>
    </div>
  );
}

/** After 5 seconds, explain the wait: the free server sleeps when unused and takes up to a minute to wake. */
function SlowHint() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setShow(true), 5000);
    return () => clearTimeout(id);
  }, []);
  if (!show) return null;
  return (
    <p role="status" className="max-w-xs text-sm text-muted">
      Waking up the server. The first visit after a break can take up to a minute.
    </p>
  );
}

function AccountBox({ name }: { name: string | null }) {
  const { session } = useAuth();
  const display = name || session?.user.email?.split("@")[0] || "You";
  return (
    <div className="flex items-center gap-3">
      <Link to="/profile" aria-label={`${display}, view profile`} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 text-left transition hover:bg-ink-850">
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-800 font-semibold text-accent">
          {display.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{display}</span>
          <span className="block truncate text-xs text-muted">{session?.user.email}</span>
        </span>
      </Link>
      <button type="button" aria-label="Sign out" onClick={() => supabase.auth.signOut()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-ink-850 hover:text-danger">
        <LogOut size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

export default function SignedInApp() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  const load = useCallback(() => {
    setError("");
    api<Profile>("/profile")
      .then(setProfile)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again."));
  }, []);

  useEffect(load, [load]);

  useEffect(() => {
    if (typeof window.scrollTo === "function") window.scrollTo({ top: 0 });
  }, [location.pathname]);

  if (error) {
    return (
      <FullScreen>
        <p role="alert">{error}</p>
        <Button onClick={load}>Try again</Button>
      </FullScreen>
    );
  }
  if (!profile) {
    return (
      <FullScreen>
        <LogoMark size={44} />
        <p className="text-muted">Loading your profile...</p>
        <SlowHint />
      </FullScreen>
    );
  }

  if (!profile.onboarding_complete) {
    return <ProfileWizard initial={profile} mode="onboarding" onSaved={(p) => { setProfile(p); navigate("/", { replace: true }); }} />;
  }
  if (location.pathname === "/profile/edit") {
    return (
      <ProfileWizard
        initial={profile}
        mode="edit"
        onSaved={(p) => { setProfile(p); navigate("/profile"); }}
        onCancel={() => navigate("/profile")}
      />
    );
  }

  const go = (where: keyof typeof PATHS) => navigate(PATHS[where]);
  const showSaathi = location.pathname === "/" || location.pathname === "/money";
  const adding = Boolean((location.state as { add?: boolean } | null)?.add);

  return (
    <AppShell
      items={NAV}
      action={{ label: "Add entry", icon: Plus, onClick: () => navigate("/money", { state: { add: true } }) }}
      side={showSaathi ? <SaathiPanel key={location.key} onAction={go} /> : undefined}
      account={<AccountBox name={profile.display_name} />}
    >
      <Routes>
        <Route path="/" element={<HomePage profile={profile} onGo={go} />} />
        {/* key: pressing "Add entry" while already on this page opens the form again */}
        <Route path="/money" element={<MoneyPage key={location.key} startAdding={adding} />} />
        <Route path="/profile" element={<ProfilePage profile={profile} onEdit={() => navigate("/profile/edit")} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
