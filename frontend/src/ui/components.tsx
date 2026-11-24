import { forwardRef, useEffect, useState, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from "react";

/** Joins class names, skipping empty ones. */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

// ---------- Button ----------

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover hover:shadow-glow",
  secondary: "border border-line bg-ink-800/60 text-text hover:border-accent/50 hover:bg-ink-800",
  ghost: "text-muted hover:bg-ink-800 hover:text-text",
  danger: "border border-danger/50 text-danger hover:bg-danger/10",
};

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }>(
  function Button({ variant = "secondary", className, type = "button", ...rest }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          // 44px tall: big enough for a thumb
          "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold whitespace-nowrap",
          "transition duration-200 ease-out active:scale-[0.97]",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 disabled:hover:shadow-none",
          BUTTON_STYLES[variant],
          className,
        )}
        {...rest}
      />
    );
  },
);

// ---------- Card ----------

type CardVariant = "solid" | "glass" | "highlight";

export function Card({
  variant = "solid",
  interactive = false,
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { variant?: CardVariant; interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-card p-5",
        variant === "solid" && "border border-line bg-ink-850 shadow-soft",
        variant === "glass" && "glass",
        variant === "highlight" && "card-highlight",
        // On computers: lift slightly and glow on hover. On phones: gentle press.
        interactive && "transition duration-200 ease-out hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lift active:scale-[0.99]",
        className,
      )}
      {...rest}
    />
  );
}

// ---------- Chip (pill filter) ----------

export function Chip({ selected, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "min-h-9 rounded-full px-4 text-sm transition duration-200 active:scale-[0.97]",
        selected ? "bg-accent font-semibold text-on-accent" : "border border-line text-muted hover:border-accent/50 hover:text-text",
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

// ---------- Progress bar ----------

export type ProgressStatus = "ok" | "near" | "over";

// Status colours are separate from the orange brand colour, so a warning never looks like a button.
const BAR_COLOUR: Record<ProgressStatus, string> = { ok: "bg-success", near: "bg-warn", over: "bg-danger" };

/** A progress bar that fills up smoothly. Width is capped at 100% even when over the limit. */
export function Progress({ value, max, status = "ok", label }: { value: number; max: number; status?: ProgressStatus; label: string }) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(percent)); // start at 0, then fill
    return () => cancelAnimationFrame(id);
  }, [percent]);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      className="h-2 overflow-hidden rounded-full bg-line"
    >
      <div className={cn("h-full rounded-full transition-[width] duration-700 ease-out", BAR_COLOUR[status])} style={{ width: `${shown}%` }} />
    </div>
  );
}

// ---------- Count-up number ----------

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Animates a number from 0 up to `target`. Shows the final number at once if motion is reduced. */
export function useCountUp(target: number, durationMs = 700): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
  useEffect(() => {
    if (prefersReducedMotion() || typeof requestAnimationFrame !== "function") {
      setValue(target);
      return;
    }
    let start: number | null = null;
    let frame = 0;
    const tick = (now: number) => {
      // Start the clock on the first frame, and keep progress between 0 and 1.
      // (Frame times can be slightly earlier than "now", which once made the number go negative.)
      if (start === null) start = now;
      const t = Math.min(1, Math.max(0, (now - start) / durationMs));
      const eased = 1 - (1 - t) ** 3; // fast start, gentle finish
      setValue(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);
  return value;
}

export function CountUpRupees({ value, className }: { value: number; className?: string }) {
  const shown = useCountUp(Math.abs(value));
  return (
    <span className={className}>
      {/* Screen readers get the final number straight away, not the animation. */}
      <span aria-hidden="true">₹{shown.toLocaleString("en-IN")}</span>
      <span className="sr-only">₹{Math.abs(value).toLocaleString("en-IN")}</span>
    </span>
  );
}

// ---------- Background glow ----------

/** Soft orange glows behind everything (kept faint so text stays easy to read). Purely decorative. */
export function GlowBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-48 right-[-8rem] h-[30rem] w-[30rem] rounded-full bg-accent/10 blur-3xl" />
      <div className="absolute -bottom-56 -left-40 h-[26rem] w-[26rem] rounded-full bg-accent/[0.06] blur-3xl" />
    </div>
  );
}

// ---------- Form fields ----------

export const fieldClass =
  "min-h-11 w-full rounded-xl border border-line bg-ink-800 px-3 text-text placeholder:text-muted/70 " +
  "transition focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30 aria-[invalid=true]:border-danger";
