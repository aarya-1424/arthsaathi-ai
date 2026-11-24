import { cn } from "./components";

/** ArthSaathi mark: the Devanagari letter "अ" (for Arth) in a mint circle. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-mint font-semibold text-on-mint", className)}
      style={{ width: size, height: size, fontSize: size * 0.55, lineHeight: 1, fontFamily: '"Noto Sans Devanagari", sans-serif' }}
    >
      अ
    </span>
  );
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={size} />
      <span className="text-base font-semibold tracking-tight">ArthSaathi</span>
    </span>
  );
}
