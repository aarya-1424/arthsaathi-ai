import { ArrowRight, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { api, ApiError } from "../lib/api";
import { TREND_SERIES } from "../money/MoneyPage";
import { currentMonth, monthLabel, shortMonth, type MonthTotal, type Summary } from "../money/types";
import { OCCUPATIONS, rupees, type Profile } from "../profile/types";
import { BarChart } from "../ui/charts";
import { Button, Card, cn, CountUpRupees } from "../ui/components";

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

/** Home: a calm overview of this month, from real data only. (The full dashboard comes in a later milestone.) */
export function HomePage(props: { profile: Profile; onGo: (view: "money" | "profile") => void }) {
  const { session } = useAuth();
  const month = currentMonth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trend, setTrend] = useState<MonthTotal[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setError("");
    Promise.all([
      api<Summary>(`/money/summary?month=${month}`),
      api<MonthTotal[]>(`/money/trend?end=${month}&months=6`).catch(() => null),
    ])
      .then(([s, t]) => {
        setSummary(s);
        setTrend(t);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again."));
  }, [month]);

  useEffect(load, [load]);

  const f = props.profile.financial!;
  const name = props.profile.display_name || session?.user.email?.split("@")[0] || "there";
  const occupation = OCCUPATIONS.find((o) => o.value === f.occupation)?.label;
  const hasTrend = trend?.some((t) => t.income > 0 || t.expenses > 0) ?? false;
  const empty = summary?.entry_count === 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted">{greeting()}</p>
        <h1 className="text-3xl font-semibold tracking-tight">{name}</h1>
        <p className="mt-1 text-muted">Let's make your money work better for you.</p>
      </div>

      {error && (
        <Card role="alert" className="flex flex-col items-start gap-3">
          <p>{error}</p>
          <Button onClick={load}>Try again</Button>
        </Card>
      )}
      {!summary && !error && <p className="text-muted">Loading your month...</p>}

      {summary && empty && (
        <Card variant="highlight" className="flex flex-col items-start gap-4">
          <div>
            <p className="text-sm text-muted">{monthLabel(month)}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">Let's start your month</p>
            <p className="mt-1 text-sm text-muted">Add the money you received and spent. Rough amounts are fine. Your charts will appear here.</p>
          </div>
          <Button variant="primary" onClick={() => props.onGo("money")}><Plus size={18} aria-hidden="true" />Add your first entry</Button>
        </Card>
      )}

      {summary && !empty && (
        <section aria-label="This month" className="grid gap-4 sm:grid-cols-2">
          <Card variant="highlight" className="sm:col-span-2">
            <p className="text-sm text-muted">{summary.remaining < 0 ? "Overspent" : "Left"} in {monthLabel(month)}</p>
            <CountUpRupees value={summary.remaining} className={cn("mt-1 block text-4xl font-semibold tracking-tight", summary.remaining < 0 && "text-danger")} />
            {summary.savings_rate_percent !== null && summary.remaining > 0 && (
              <p className="mt-2 text-sm text-mint">You kept {summary.savings_rate_percent}% of what you received.</p>
            )}
          </Card>
          <Card interactive className="cursor-pointer" onClick={() => props.onGo("money")}>
            <p className="text-sm text-muted">Received</p>
            <p className="mt-1 text-2xl font-semibold">{rupees(summary.total_income)}</p>
          </Card>
          <Card interactive className="cursor-pointer" onClick={() => props.onGo("money")}>
            <p className="text-sm text-muted">Spent</p>
            <p className="mt-1 text-2xl font-semibold">{rupees(summary.total_expenses)}</p>
            {summary.comparison && summary.comparison.expense_change !== 0 && (
              <p className="mt-1 text-xs text-muted">
                {rupees(Math.abs(summary.comparison.expense_change))} {summary.comparison.expense_change > 0 ? "more" : "less"} than last month
              </p>
            )}
          </Card>
        </section>
      )}

      {hasTrend && trend && (
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Last 6 months</h2>
            <button type="button" onClick={() => props.onGo("money")} className="flex items-center gap-1 text-sm text-muted transition hover:text-mint">
              My Money <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
          <BarChart
            label="Money received and spent over the last 6 months"
            series={TREND_SERIES}
            groups={trend.map((t) => ({ label: shortMonth(t.month), values: [t.income, t.expenses] }))}
          />
        </Card>
      )}

      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm">
          <p className="font-semibold">Your profile</p>
          <p className="text-muted">
            {occupation} · Income {rupees(f.monthly_income)} · Expenses {rupees(f.monthly_expenses)} a month
          </p>
        </div>
        <Button onClick={() => props.onGo("profile")}>View profile</Button>
      </Card>
    </div>
  );
}
