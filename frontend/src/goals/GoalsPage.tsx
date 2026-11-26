import { Check, Ellipsis, Pencil, Plus, Target, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { rupees } from "../profile/types";
import { Button, Card, cn, Progress, Skeleton } from "../ui/components";
import { longDate } from "../ui/fields";
import { Sheet, useToast } from "../ui/overlays";
import { AddMoneyForm, GoalForm } from "./GoalForm";
import { monthYear, PRIORITY_LABEL, QUICK_GOALS, type Goal } from "./types";

type Panel =
  | { type: "none" }
  | { type: "new"; name?: string }
  | { type: "edit"; goal: Goal }
  | { type: "money"; goal: Goal };

type Line = { tone: "muted" | "good" | "warn"; text: string };
const TONE = { muted: "text-muted", good: "text-success", warn: "text-warn" };

/**
 * The plan for a goal, in plain sentences. Every number comes from the server's calculation;
 * nothing is worked out here.
 */
export function planLines(g: Goal): Line[] {
  if (g.completed) return [{ tone: "good", text: "Goal reached. Well done." }];
  const lines: Line[] = [];
  if (g.overdue && g.target_date) {
    lines.push({ tone: "warn", text: `The target date (${longDate(g.target_date)}) has passed. You can set a new date.` });
  }
  if (g.suggested_monthly !== null && g.months_left !== null && g.target_date) {
    const months = g.months_left === 1 ? "1 month left" : `${g.months_left} months left`;
    lines.push({ tone: "muted", text: `To reach it by ${longDate(g.target_date)}, save about ${rupees(g.suggested_monthly)} a month (${months}).` });
  }
  if (g.monthly_contribution) {
    if (g.estimated_completion) {
      lines.push({ tone: "muted", text: `At ${rupees(g.monthly_contribution)} a month, you'd reach it around ${monthYear(g.estimated_completion)}.` });
    } else {
      lines.push({ tone: "warn", text: `At ${rupees(g.monthly_contribution)} a month, this would take a very long time. Try a larger amount.` });
    }
    if (g.on_track === true) lines.push({ tone: "good", text: "You're on track for your target date." });
    if (g.on_track === false && !g.overdue) lines.push({ tone: "warn", text: "At this pace you'd get there after your target date." });
  }
  if (lines.length === 0) lines.push({ tone: "muted", text: "Add a target date or a monthly amount to see a plan." });
  return lines;
}

export function GoalsPage() {
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [error, setError] = useState("");
  const [panel, setPanel] = useState<Panel>({ type: "none" });
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [toast, showToast] = useToast();

  const load = useCallback(() => {
    setError("");
    api<Goal[]>("/goals")
      .then(setGoals)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again."));
  }, []);

  useEffect(load, [load]);

  const closePanel = useCallback(() => setPanel({ type: "none" }), []);

  function saved(message: string) {
    closePanel();
    setOpenRow(null);
    showToast(message);
    load(); // the server decides the order (most important first, reached goals last)
  }

  async function remove(id: string) {
    setDeleteError("");
    try {
      await api(`/goals/${id}`, { method: "DELETE" });
      setConfirmDelete(null);
      setOpenRow(null);
      showToast("Goal deleted");
      load();
    } catch (e) {
      setDeleteError(e instanceof ApiError ? e.message : "Could not delete. Please try again.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">Goals</h1>
        {goals && goals.length > 0 && (
          <Button variant="primary" onClick={() => setPanel({ type: "new" })}><Plus size={18} aria-hidden="true" />New goal</Button>
        )}
      </div>

      {error && (
        <Card role="alert" className="flex flex-col items-start gap-3">
          <p>{error}</p>
          <Button onClick={load}>Try again</Button>
        </Card>
      )}

      {!goals && !error && (
        <div role="status" aria-label="Loading your goals" className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      )}

      {goals && goals.length === 0 && (
        <Card variant="highlight" className="flex flex-col items-start gap-5">
          <div>
            <p className="text-2xl font-semibold tracking-tight">What are you saving for?</p>
            <p className="mt-1 max-w-xl text-sm text-muted">
              Give your savings a purpose. You'll see how far you've come, how much to put aside each month, and when you could get there.
            </p>
          </div>
          <div role="group" aria-label="Start with a common goal" className="flex flex-wrap gap-2">
            {QUICK_GOALS.map((name) => (
              <button key={name} type="button" onClick={() => setPanel({ type: "new", name })}
                className="min-h-10 rounded-full border border-line bg-ink-850 px-4 text-sm transition hover:border-line-strong hover:bg-ink-800 active:scale-[0.97]">
                {name}
              </button>
            ))}
          </div>
          <Button variant="primary" onClick={() => setPanel({ type: "new" })}><Plus size={18} aria-hidden="true" />Create your own goal</Button>
        </Card>
      )}

      {goals && goals.length > 0 && (
        <>
          <ul className="grid gap-4 md:grid-cols-2">
            {goals.map((g) => {
              const open = openRow === g.id;
              return (
                <li key={g.id}>
                  <Card aria-label={g.name} role="group" className="flex h-full flex-col gap-4">
                    <div className="flex items-start gap-3">
                      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                        g.completed ? "border-success/40 bg-success/10 text-success" : "border-line bg-ink-800 text-muted")}>
                        {g.completed ? <Check size={18} aria-hidden="true" /> : <Target size={18} aria-hidden="true" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-lg font-semibold">{g.name}</h2>
                        <p className="text-xs text-muted">
                          {g.completed ? "Reached" : PRIORITY_LABEL[g.priority]}
                          {g.target_date && !g.completed && ` · by ${longDate(g.target_date)}`}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Options for ${g.name}`}
                        aria-expanded={open}
                        onClick={() => { setOpenRow(open ? null : g.id); setConfirmDelete(null); setDeleteError(""); }}
                        className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition hover:bg-ink-800 hover:text-text", open ? "bg-ink-800 text-text" : "text-muted")}
                      >
                        <Ellipsis size={18} aria-hidden="true" />
                      </button>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex items-baseline justify-between gap-3">
                        <p><span className="text-2xl font-semibold tracking-tight">{rupees(g.saved_amount)}</span> <span className="text-sm text-muted">of {rupees(g.target_amount)}</span></p>
                        <p className="text-sm font-semibold">{g.progress_percent}%</p>
                      </div>
                      <Progress value={Math.min(g.saved_amount, g.target_amount)} max={g.target_amount} status={g.completed ? "ok" : "accent"} label={`${g.name} progress`} />
                      {!g.completed && <p className="text-xs text-muted">{rupees(g.remaining)} to go</p>}
                    </div>

                    <ul className="flex flex-col gap-1 text-sm">
                      {planLines(g).map((line) => <li key={line.text} className={TONE[line.tone]}>{line.text}</li>)}
                    </ul>
                    {g.notes && <p className="text-xs text-muted">{g.notes}</p>}

                    <div className="mt-auto flex flex-wrap items-center gap-2">
                      {!open && !g.completed && (
                        <Button className="min-h-10 px-4" onClick={() => setPanel({ type: "money", goal: g })}><Plus size={16} aria-hidden="true" />Add money</Button>
                      )}
                      {open && confirmDelete !== g.id && (
                        <>
                          <Button className="min-h-10 px-4" onClick={() => setPanel({ type: "edit", goal: g })}><Pencil size={14} aria-hidden="true" />Edit</Button>
                          <Button variant="danger" className="min-h-10 px-4" onClick={() => setConfirmDelete(g.id)}><Trash2 size={14} aria-hidden="true" />Delete</Button>
                        </>
                      )}
                      {open && confirmDelete === g.id && (
                        <>
                          <span className="text-sm">Delete this goal?</span>
                          <Button variant="danger" className="min-h-10 px-4" onClick={() => remove(g.id)}>Yes, delete</Button>
                          <Button variant="ghost" className="min-h-10 px-4" onClick={() => { setConfirmDelete(null); setDeleteError(""); }}>No</Button>
                          {deleteError && <span role="alert" className="text-sm text-danger">{deleteError}</span>}
                        </>
                      )}
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-muted">
            Plans assume you save the same amount every month and don't count any interest. They're a guide for planning, not a promise.
          </p>
        </>
      )}

      {panel.type === "new" && (
        <Sheet title="New goal" onClose={closePanel}>
          <GoalForm startName={panel.name} onSaved={() => saved("Goal added")} onCancel={closePanel} />
        </Sheet>
      )}
      {panel.type === "edit" && (
        <Sheet title="Change goal" onClose={closePanel}>
          <GoalForm editing={panel.goal} onSaved={() => saved("Goal updated")} onCancel={closePanel} />
        </Sheet>
      )}
      {panel.type === "money" && (
        <Sheet title={`Add money to ${panel.goal.name}`} onClose={closePanel}>
          <AddMoneyForm
            goal={panel.goal}
            onSaved={(g, added) => saved(g.completed ? `Goal reached: ${g.name}` : `Added ${rupees(added)} to ${g.name}`)}
            onCancel={closePanel}
          />
        </Sheet>
      )}
      {toast}
    </div>
  );
}
