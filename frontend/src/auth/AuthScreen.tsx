import { X } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { Button, fieldClass, GlowBackground } from "../ui/components";
import { Logo, LogoMark } from "../ui/Logo";
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

const TITLES: Record<Mode, { title: string; subtitle: string }> = {
  signin: { title: "Welcome back", subtitle: "Sign in to see your money." },
  signup: { title: "Create your account", subtitle: "It takes less than a minute." },
  forgot: { title: "Reset your password", subtitle: "We'll email you a reset link." },
};

/** The sign in / sign up / forgot password form. */
export function AuthForm({ initialMode = "signin" }: { initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const ids = { name: useId(), email: useId(), password: useId(), title: useId() };

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
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name.trim() }, emailRedirectTo: window.location.origin },
        });
        if (err) setError(friendly(err.message));
        // With email confirmation OFF, we get a session and the app opens right away.
        // With it ON (later), there is no session yet, so ask the user to check their email.
        else if (!data?.session) setNotice("Almost done. Please check your email and confirm your account, then sign in.");
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight" data-auth-title>{TITLES[mode].title}</h2>
        <p className="text-sm text-muted">{TITLES[mode].subtitle}</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {mode === "signup" && (
          <div className="flex flex-col gap-1.5 text-sm">
            <label htmlFor={ids.name}>What should we call you?</label>
            <input id={ids.name} className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="given-name" />
          </div>
        )}
        <div className="flex flex-col gap-1.5 text-sm">
          <label htmlFor={ids.email}>Email</label>
          <input id={ids.email} className={fieldClass} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" />
        </div>
        {mode !== "forgot" && (
          <div className="flex flex-col gap-1.5 text-sm">
            <label htmlFor={ids.password}>Password</label>
            <input
              id={ids.password}
              className={fieldClass}
              type="password"
              required
              value={password}
              aria-invalid={error.startsWith("Password") || undefined}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
            {mode === "signup" && <span className="text-xs text-muted">At least 8 characters.</span>}
          </div>
        )}
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        {notice && <p role="status" className="text-sm text-success">{notice}</p>}
        <Button type="submit" variant="primary" disabled={busy} className="w-full">
          {busy ? "Please wait..." : mode === "signin" ? "Sign in" : mode === "signup" ? "Sign up" : "Send reset link"}
        </Button>
      </form>

      <div className="flex flex-col items-start gap-1 text-sm">
        {mode !== "signin" && <button type="button" className="text-muted underline-offset-4 hover:text-text hover:underline" onClick={() => switchTo("signin")}>I already have an account</button>}
        {mode !== "signup" && <button type="button" className="text-muted underline-offset-4 hover:text-text hover:underline" onClick={() => switchTo("signup")}>Create a new account</button>}
        {mode === "signin" && <button type="button" className="text-muted underline-offset-4 hover:text-text hover:underline" onClick={() => switchTo("forgot")}>Forgot password?</button>}
      </div>

      <p className="text-xs text-muted">We will never ask for your bank password, UPI PIN, OTP or card PIN.</p>
    </div>
  );
}

/**
 * Sign in / sign up as a centred pop-up card over the blurred landing page.
 * Escape, the close button or clicking outside closes it, and focus goes back where it was.
 */
export function AuthSheet({ initialMode, onClose }: { initialMode: Mode; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const firstInput = panel.current?.querySelector("input");
    firstInput?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // page behind doesn't scroll
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      before?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-md" onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="pop-in relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-[2rem] border border-line bg-ink-900 p-6 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8),0_0_60px_-30px_rgb(255_106_43/0.6)] sm:p-8"
      >
        <div className="mb-6 flex items-center justify-between">
          <span id={titleId} className="sr-only">ArthSaathi account</span>
          <Logo size={30} />
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full text-muted transition hover:bg-ink-800 hover:text-text">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <AuthForm initialMode={initialMode} />
      </div>
    </div>
  );
}

/** Kept for places that need a full-page sign in (for example, if the landing page is skipped). */
export function AuthScreen() {
  return (
    <div className="theme-dark relative isolate flex min-h-dvh items-center justify-center px-4 py-10">
      <GlowBackground />
      <div className="glass w-full max-w-md rounded-[2rem] p-6 sm:p-8">
        <div className="mb-6"><Logo size={30} /></div>
        <AuthForm />
      </div>
    </div>
  );
}

/** Shown after the user opens the reset link from their email. */
export function NewPasswordScreen() {
  const { finishRecovery } = useAuth();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const id = useId();

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
    <div className="theme-dark relative isolate flex min-h-dvh items-center justify-center px-4 py-10">
      <GlowBackground />
      <div className="glass flex w-full max-w-md flex-col gap-6 rounded-[2rem] p-6 sm:p-8">
        <LogoMark size={40} />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
          <p className="text-sm text-muted">At least 8 characters.</p>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 text-sm">
            <label htmlFor={id}>New password</label>
            <input id={id} className={fieldClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </div>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button type="submit" variant="primary" disabled={busy} className="w-full">
            {busy ? "Please wait..." : "Save new password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
