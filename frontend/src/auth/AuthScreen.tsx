import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthProvider";

type Mode = "signin" | "signup" | "forgot";

const MIN_PASSWORD = 8;

/** Turns technical errors into friendly sentences. Never says whether an email exists. */
function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "Email or password is not correct.";
  if (m.includes("email not confirmed")) return "Please confirm your email first. Check your inbox.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many tries. Please wait a few minutes.";
  if (m.includes("password")) return "Please choose a stronger password (at least 8 characters).";
  return "Something went wrong. Please try again.";
}

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function switchTo(next: Mode) {
    setMode(next);
    setError("");
    setNotice("");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return; // stops double submits
    setError("");
    setNotice("");
    if (mode !== "forgot" && password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) setError(friendly(err.message));
      } else if (mode === "signup") {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name.trim() }, emailRedirectTo: window.location.origin },
        });
        if (err) setError(friendly(err.message));
        else setNotice("Almost done. Please check your email and confirm your account, then sign in.");
      } else {
        await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        // Same message whether or not the email exists, so nobody can probe for accounts.
        setNotice("If this email has an account, a reset link is on its way.");
      }
    } catch {
      setError("Could not reach the server. Please check your internet and try again.");
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset your password";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-4">
      <h1 className="text-3xl font-semibold">ArthSaathi</h1>
      <h2 className="text-xl">{title}</h2>
      <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
        {mode === "signup" && (
          <label className="flex flex-col gap-1 text-sm">
            What should we call you?
            <input className="rounded border p-2" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="given-name" />
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input className="rounded border p-2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        {mode !== "forgot" && (
          <label className="flex flex-col gap-1 text-sm">
            Password
            <input
              className="rounded border p-2"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </label>
        )}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="text-sm text-green-800">{notice}</p>}
        <button type="submit" disabled={busy} className="rounded bg-emerald-800 p-2 text-white disabled:opacity-60">
          {busy ? "Please wait..." : mode === "signin" ? "Sign in" : mode === "signup" ? "Sign up" : "Send reset link"}
        </button>
      </form>
      <div className="flex flex-col gap-1 text-sm">
        {mode !== "signin" && <button className="text-left underline" onClick={() => switchTo("signin")}>I already have an account</button>}
        {mode !== "signup" && <button className="text-left underline" onClick={() => switchTo("signup")}>Create a new account</button>}
        {mode === "signin" && <button className="text-left underline" onClick={() => switchTo("forgot")}>Forgot password?</button>}
      </div>
    </main>
  );
}

/** Shown after the user opens the reset link from their email. */
export function NewPasswordScreen() {
  const { finishRecovery } = useAuth();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    setBusy(true);
    setError("");
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) setError(friendly(err.message));
    else finishRecovery();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-4">
      <h1 className="text-3xl font-semibold">ArthSaathi</h1>
      <h2 className="text-xl">Choose a new password</h2>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          New password
          <input className="rounded border p-2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={busy} className="rounded bg-emerald-800 p-2 text-white disabled:opacity-60">
          {busy ? "Please wait..." : "Save new password"}
        </button>
      </form>
    </main>
  );
}
