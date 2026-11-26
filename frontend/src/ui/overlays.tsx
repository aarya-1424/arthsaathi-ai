import { Check, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";

/**
 * A pop-up for forms. Phone: slides up from the bottom. Computer: centred card.
 * Escape, the close button or clicking outside closes it; Tab stays inside it;
 * focus returns to where it was; the page behind doesn't scroll.
 */
export function Sheet(props: { title: string; onClose: () => void; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const { onClose } = props;

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const el = panel.current;
    el?.querySelector<HTMLElement>("input:not([type=radio]):not([type=hidden]), select, textarea")?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      if (e.key !== "Tab" || !el) return;
      const items = Array.from(el.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"))
        .filter((i) => !i.hasAttribute("disabled"));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      before?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="pop-in relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[1.75rem] border border-line bg-ink-900 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-lift sm:max-w-lg sm:rounded-[1.75rem] sm:p-7"
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-xl font-semibold">{props.title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-ink-800 hover:text-text">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {props.children}
      </div>
    </div>
  );
}

/**
 * A short confirmation message ("Entry added") that appears for a few seconds.
 * Usage: const [toast, showToast] = useToast();  ...  {toast}
 */
export function useToast(durationMs = 3500): [ReactNode, (message: string) => void] {
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback((text: string) => {
    clearTimeout(timer.current);
    setMessage(text);
    timer.current = setTimeout(() => setMessage(""), durationMs);
  }, [durationMs]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const node = (
    // The live region is always present, so screen readers announce new messages.
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 lg:bottom-8">
      {message && (
        <div className="pop-in flex items-center gap-2 rounded-full border border-line-strong bg-ink-800 px-4 py-2.5 text-sm font-semibold shadow-lift">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success text-ink-950"><Check size={13} strokeWidth={3} aria-hidden="true" /></span>
          {message}
        </div>
      )}
    </div>
  );
  return [node, show];
}
