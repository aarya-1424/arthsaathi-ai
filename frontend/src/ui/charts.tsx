import { useEffect, useState, type ReactNode } from "react";

/**
 * Lightweight charts drawn with SVG (no heavy chart library), so they load fast on cheap phones.
 * Every chart has a text description for screen readers, and a visible legend with the real numbers.
 */

/** Mint shades plus greys: charts stay inside our one-accent colour system. */
export const CHART_COLOURS = ["#3ddc97", "#2a8f68", "#bdf5da", "#6f8f82", "#1d5c44", "#4b6359"];

export type Segment = { label: string; value: number; color?: string };

function useDrawn(): boolean {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true)); // start empty, then draw in
    return () => cancelAnimationFrame(id);
  }, []);
  return drawn;
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export function Donut(props: {
  segments: Segment[];
  label: string; // what the chart shows, for screen readers
  size?: number;
  thickness?: number;
  center?: ReactNode;
}) {
  const { size = 200, thickness = 22 } = props;
  const drawn = useDrawn();
  const segments = props.segments.filter((s) => s.value > 0);
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;
  const gap = segments.length > 1 ? 3 : 0; // small gap between slices

  const description = total > 0
    ? `${props.label}: ` + segments.map((s) => `${s.label} ${inr(s.value)} (${Math.round((s.value / total) * 100)}%)`).join(", ")
    : `${props.label}: no data yet`;

  let start = 0;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={description}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={thickness} />
        {total > 0 && segments.map((s, i) => {
          const length = (s.value / total) * circumference;
          const visible = Math.max(0, length - gap);
          const offset = start;
          start += length;
          return (
            <circle
              key={s.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color ?? CHART_COLOURS[i % CHART_COLOURS.length]}
              strokeWidth={thickness}
              strokeLinecap="butt"
              strokeDasharray={`${drawn ? visible : 0} ${circumference}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              style={{ transition: "stroke-dasharray 700ms ease-out" }}
            />
          );
        })}
      </svg>
      {props.center && <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{props.center}</div>}
    </div>
  );
}

/** The colour key under a chart, with the real amounts and shares. */
export function Legend({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  return (
    <ul className="flex flex-col gap-2 text-sm">
      {segments.map((s, i) => (
        <li key={s.label} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: s.color ?? CHART_COLOURS[i % CHART_COLOURS.length] }} />
            {s.label}
          </span>
          <span className="text-muted">
            {inr(s.value)}
            {total > 0 && <span className="ml-1.5 text-xs">{Math.round((s.value / total) * 100)}%</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ---------- Short Indian number format ----------

/** ₹950, ₹25k, ₹1.5L (lakh), ₹2.3Cr (crore). Used only for chart labels; full amounts are shown elsewhere. */
export function compactInr(n: number): string {
  const sign = n < 0 ? "-" : "";
  const a = Math.abs(Math.round(n));
  const round1 = (x: number) => Math.round(x * 10) / 10;
  if (a < 1000) return `${sign}₹${a}`;
  // Move up a unit when rounding would print "100k" or "100L".
  if (round1(a / 1000) < 100) return `${sign}₹${round1(a / 1000)}k`;
  if (round1(a / 100_000) < 100) return `${sign}₹${round1(a / 100_000)}L`;
  return `${sign}₹${round1(a / 10_000_000)}Cr`;
}

/** A tidy top value for the chart scale (like 15k, 30k, 50k) at or above `max`, so bars fill the space well. */
export function niceMax(max: number): number {
  if (max <= 0) return 1000;
  const power = 10 ** Math.floor(Math.log10(max));
  for (const step of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (step * power >= max) return step * power;
  return 10 * power;
}

// ---------- Bar chart (money in vs money out, by month) ----------

export type BarGroup = { label: string; values: number[] }; // values follow the order of `series`

export function BarChart(props: {
  groups: BarGroup[];
  series: { label: string; color: string }[];
  label: string;
  height?: number;
}) {
  const { groups, series, height = 180 } = props;
  const drawn = useDrawn();
  const top = niceMax(Math.max(0, ...groups.flatMap((g) => g.values)));
  const width = 600;
  const padLeft = 44;
  const padBottom = 24;
  const plotH = height - padBottom - 8;
  const groupW = (width - padLeft) / Math.max(1, groups.length);
  const barW = Math.min(18, (groupW * 0.6) / series.length);
  const ticks = [0, top / 2, top];

  const description = `${props.label}: ` + groups
    .map((g) => `${g.label}: ` + series.map((s, i) => `${s.label} ${inr(g.values[i] ?? 0)}`).join(", "))
    .join("; ");

  return (
    <div className="flex flex-col gap-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={description}>
        {ticks.map((t) => {
          const y = 8 + plotH - (t / top) * plotH;
          return (
            <g key={t}>
              <line x1={padLeft} x2={width} y1={y} y2={y} stroke="var(--color-line)" strokeDasharray={t === 0 ? undefined : "3 5"} />
              <text x={padLeft - 8} y={y + 4} textAnchor="end" fontSize="11" fill="var(--color-muted)">{compactInr(t)}</text>
            </g>
          );
        })}
        {groups.map((g, gi) => {
          const x0 = padLeft + gi * groupW + (groupW - barW * series.length - 4 * (series.length - 1)) / 2;
          return (
            <g key={g.label}>
              {series.map((s, si) => {
                const v = Math.max(0, g.values[si] ?? 0);
                const h = drawn ? (v / top) * plotH : 0;
                return (
                  <rect
                    key={s.label}
                    x={x0 + si * (barW + 4)}
                    y={8 + plotH - h}
                    width={barW}
                    height={h}
                    rx={Math.min(5, barW / 2)}
                    fill={s.color}
                    style={{ transition: "height 600ms ease-out, y 600ms ease-out" }}
                  />
                );
              })}
              <text x={padLeft + gi * groupW + groupW / 2} y={height - 6} textAnchor="middle" fontSize="11" fill="var(--color-muted)">{g.label}</text>
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-4 text-xs text-muted">
        {series.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
