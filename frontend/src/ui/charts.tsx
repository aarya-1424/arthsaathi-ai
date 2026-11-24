import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/**
 * Lightweight charts drawn with SVG (no heavy chart library), so they load fast on cheap phones.
 * Every chart has a text description for screen readers, and a visible legend with the real numbers.
 */

/** Orange shades plus warm greys (like template #6): charts stay inside our one-accent colour system. */
export const CHART_COLOURS = ["#ff6a2b", "#ffa477", "#ffd6bd", "#8a8580", "#c2562a", "#5c5853"];

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


// ---------- Smooth area chart (like template #6) ----------

export type AreaSeries = { label: string; color: string; values: number[] };

type Point = { x: number; y: number };

/** A smooth curve through the points. Control points are kept inside the chart so the curve never dips below zero. */
export function smoothPath(points: Point[], minY: number, maxY: number): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  const clamp = (y: number) => Math.min(maxY, Math.max(minY, y));
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: clamp(p1.y + (p2.y - p0.y) / 6) };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: clamp(p2.y - (p3.y - p1.y) / 6) };
    d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function AreaChart(props: { labels: string[]; series: AreaSeries[]; label: string; height?: number }) {
  const { labels, series, height = 220 } = props;
  const drawn = useDrawn();
  const uid = useId().replace(/:/g, "");
  const box = useRef<HTMLDivElement>(null);
  // Draw at the real on-screen width, so labels stay 11px and never shrink to an unreadable size.
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const padLeft = 46;
  const padRight = 16;
  const padTop = 34;
  const padBottom = 26;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const baseline = padTop + plotH;
  const top = niceMax(Math.max(0, ...series.flatMap((s) => s.values)));
  const n = labels.length;
  const xAt = (i: number) => (n <= 1 ? padLeft + plotW / 2 : padLeft + (i * plotW) / (n - 1));
  const yAt = (v: number) => baseline - (Math.max(0, v) / top) * plotH;

  const description = `${props.label}: ` + labels
    .map((l, i) => `${l}: ` + series.map((s) => `${s.label} ${inr(s.values[i] ?? 0)}`).join(", "))
    .join("; ");

  const lead = series[0];
  const lastIndex = n - 1;
  const lastValue = lead?.values[lastIndex] ?? 0;

  return (
    <div ref={box} className="flex flex-col gap-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full overflow-visible" role="img" aria-label={description}>
        <defs>
          {series.map((s, si) => (
            <linearGradient key={s.label} id={`${uid}-fill-${si}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={si === 0 ? 0.35 : 0.12} />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
          <clipPath id={`${uid}-reveal`}>
            <rect
              x={0}
              y={0}
              width={width}
              height={height}
              style={{ transform: drawn ? "scaleX(1)" : "scaleX(0)", transformOrigin: "0 0", transition: "transform 900ms ease-out" }}
            />
          </clipPath>
        </defs>

        {[0, top / 2, top].map((t) => (
          <g key={t}>
            <line x1={padLeft} x2={width - padRight} y1={yAt(t)} y2={yAt(t)} stroke="var(--color-line)" strokeDasharray={t === 0 ? undefined : "3 6"} />
            <text x={padLeft - 10} y={yAt(t) + 4} textAnchor="end" fontSize="11" fill="var(--color-muted)">{compactInr(t)}</text>
          </g>
        ))}
        {labels.map((l, i) => (
          <text key={l + i} x={xAt(i)} y={height - 6} textAnchor="middle" fontSize="11" fill="var(--color-muted)">{l}</text>
        ))}

        <g clipPath={`url(#${uid}-reveal)`}>
          {series.map((s, si) => ({ s, si })).reverse().map(({ s, si }) => {
            const pts = s.values.map((v, i) => ({ x: xAt(i), y: yAt(v) }));
            const line = smoothPath(pts, padTop, baseline);
            const area = `${line} L ${xAt(n - 1)} ${baseline} L ${xAt(0)} ${baseline} Z`;
            return (
              <g key={s.label}>
                <path d={area} fill={`url(#${uid}-fill-${si})`} />
                <path d={line} fill="none" stroke={s.color} strokeWidth={si === 0 ? 3 : 2} strokeLinecap="round" strokeDasharray={si === 0 ? undefined : "6 5"} />
              </g>
            );
          })}
          {lead && n > 0 && (
            <g>
              <line x1={xAt(lastIndex)} x2={xAt(lastIndex)} y1={yAt(lastValue)} y2={baseline} stroke={lead.color} strokeOpacity="0.35" strokeDasharray="3 4" />
              <circle cx={xAt(lastIndex)} cy={yAt(lastValue)} r="6" fill="var(--color-ink-950)" stroke={lead.color} strokeWidth="3" />
              <g transform={`translate(${Math.min(xAt(lastIndex), width - padRight - 38)} ${Math.max(14, yAt(lastValue) - 22)})`}>
                <rect x={-38} y={-14} width={76} height={24} rx={12} fill={lead.color} />
                <text x={0} y={3} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--color-on-accent)">{compactInr(lastValue)}</text>
              </g>
            </g>
          )}
        </g>
      </svg>
      <div className="flex flex-wrap gap-4 text-xs text-muted">
        {series.map((s, si) => (
          <span key={s.label} className="flex items-center gap-1.5">
            {si === 0
              ? <span aria-hidden="true" className="inline-block h-[3px] w-4 rounded-full" style={{ background: s.color }} />
              : <span aria-hidden="true" className="inline-block h-0 w-4 border-t-2 border-dashed" style={{ borderColor: s.color }} />}
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
