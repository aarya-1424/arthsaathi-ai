import { useCallback, useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import { NewPasswordScreen } from "./auth/AuthScreen";
import { Landing } from "./landing/Landing";
import { api, ApiError } from "./lib/api";
import { authConfigured, supabase } from "./lib/supabase";
import { MoneyPage } from "./money/MoneyPage";
import { ProfileWizard } from "./profile/ProfileWizard";
import { OCCUPATIONS, rupees, type Profile } from "./profile/types";

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function Home(props: { profile: Profile; onEdit: () => void; onMoney: () => void }) {
  const { session } = useAuth();
  const f = props.profile.financial!;
  const name = props.profile.display_name || session?.user.email?.split("@")[0] || "there";
  const occupation = OCCUPATIONS.find((o) => o.value === f.occupation)?.label;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">{greeting()}, {name}.</h1>
      <p>Let's make your money work better for you.</p>
      <section aria-label="Your profile summary" className="rounded border p-4 text-sm">
        <p>{occupation}</p>
        <p>Monthly income: {rupees(f.monthly_income)}</p>
        <p>Monthly expenses: {rupees(f.monthly_expenses)}</p>
        {f.monthly_savings !== null && <p>Monthly savings: {rupees(f.monthly_savings)}</p>}
        {f.monthly_emi !== null && f.monthly_emi > 0 && <p>Monthly EMIs: {rupees(f.monthly_emi)}</p>}
      </section>
      <p className="text-sm opacity-70">Your full dashboard is coming in a later step.</p>
      <button className="rounded bg-emerald-800 px-4 py-2 text-white" onClick={props.onMoney}>My Money</button>
      <div className="flex gap-2">
        <button className="rounded border px-3 py-1 text-sm" onClick={props.onEdit}>Edit my profile</button>
        <button className="rounded border px-3 py-1 text-sm" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>
    </main>
  );
}

function SignedIn() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<"home" | "edit" | "money">("home");

  const load = useCallback(() => {
    setError("");
    api<Profile>("/profile")
      .then(setProfile)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again."));
  }, []);

  useEffect(load, [load]);

  if (error) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-3 px-4">
        <p role="alert">{error}</p>
        <button className="w-fit rounded border px-3 py-1" onClick={load}>Try again</button>
      </main>
    );
  }
  if (!profile) return <main className="p-4">Loading your profile...</main>;

  if (!profile.onboarding_complete) {
    return <ProfileWizard initial={profile} mode="onboarding" onSaved={setProfile} />;
  }
  if (view === "money") return <MoneyPage onBack={() => setView("home")} />;
  if (view === "edit") {
    return (
      <ProfileWizard
        initial={profile}
        mode="edit"
        onSaved={(p) => { setProfile(p); setView("home"); }}
        onCancel={() => setView("home")}
      />
    );
  }
  return <Home profile={profile} onEdit={() => setView("edit")} onMoney={() => setView("money")} />;
}

function Gate() {
  const { session, loading, recovering } = useAuth();
  if (!authConfigured) {
    return (
      <main className="theme-dark flex min-h-dvh items-center justify-center px-4">
        <p role="alert">Login is not set up yet. Add the Supabase settings to frontend/.env.local.</p>
      </main>
    );
  }
  if (loading) return <main className="theme-dark min-h-dvh p-6 text-muted">Loading...</main>;
  if (recovering) return <NewPasswordScreen />;
  return session ? <SignedIn /> : <Landing />;
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
