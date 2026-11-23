import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import { AuthScreen, NewPasswordScreen } from "./auth/AuthScreen";
import { authConfigured, supabase } from "./lib/supabase";

type Status = "checking" | "ok" | "down";

function Home() {
  const { session } = useAuth();
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    fetch("/api/me", { headers: { Authorization: `Bearer ${session?.access_token ?? ""}` } })
      .then((r) => setStatus(r.ok ? "ok" : "down"))
      .catch(() => setStatus("down"));
  }, [session]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-3 px-4">
      <h1 className="text-3xl font-semibold">ArthSaathi</h1>
      <p>You are signed in{session?.user.email ? ` as ${session.user.email}` : ""}.</p>
      <p role="status" className="text-sm opacity-70">
        {status === "checking" && "Checking server..."}
        {status === "ok" && "Server connected."}
        {status === "down" && "Server is not reachable right now."}
      </p>
      <button className="w-fit rounded border px-3 py-1 text-sm" onClick={() => supabase.auth.signOut()}>
        Sign out
      </button>
    </main>
  );
}

function Gate() {
  const { session, loading, recovering } = useAuth();
  if (!authConfigured) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
        <p role="alert">Login is not set up yet. Add the Supabase settings to frontend/.env.local.</p>
      </main>
    );
  }
  if (loading) return <main className="p-4">Loading...</main>;
  if (recovering) return <NewPasswordScreen />;
  return session ? <Home /> : <AuthScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
