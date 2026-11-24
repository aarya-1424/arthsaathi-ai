import { ChevronRight, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { currentMonth, type Summary } from "../money/types";
import { Card, cn } from "../ui/components";
import { nextSteps, type StepAction } from "./nextSteps";

const TONE = { info: "text-accent", warn: "text-warn", danger: "text-danger" };

/** The companion panel: a few next steps based on this month's real numbers. */
export function SaathiPanel({ onAction }: { onAction: (action: StepAction) => void }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    api<Summary>(`/money/summary?month=${currentMonth()}`)
      .then((s) => alive && setSummary(s))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const steps = nextSteps(summary);

  return (
    <Card variant="glass" className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent"><Sparkles size={18} aria-hidden="true" /></span>
        <div>
          <p className="font-semibold">Your Saathi</p>
          <p className="text-xs text-muted">Next steps for you</p>
        </div>
      </div>
      {!summary && !failed && <p className="text-sm text-muted">Looking at your month...</p>}
      {failed && <p className="text-sm text-muted">Next steps will show here once we can load your month.</p>}
      {steps.length > 0 && (
        <ul className="flex flex-col gap-2 text-sm">
          {steps.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onAction(s.action)}
                className="flex w-full items-center gap-3 rounded-xl border border-line px-3 py-3 text-left transition hover:border-accent/40 hover:bg-ink-800 active:scale-[0.99]"
              >
                <span aria-hidden="true" className={cn("h-2 w-2 shrink-0 rounded-full bg-current", TONE[s.tone])} />
                <span className="flex-1">{s.text}</span>
                <ChevronRight size={16} aria-hidden="true" className="text-muted" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted">Ask ArthSaathi is coming soon: questions in English, Hindi or Hinglish.</p>
    </Card>
  );
}
