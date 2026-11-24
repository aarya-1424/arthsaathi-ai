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
