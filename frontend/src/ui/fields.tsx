import { useState, type InputHTMLAttributes } from "react";
import { cn, fieldClass } from "./components";

/** Dropdowns: same look as other fields, with our own arrow instead of the browser's. */
export const selectClass = `${fieldClass} select-arrow appearance-none pr-10`;

/** "28000" -> "28,000" (Indian grouping: 1,50,000). Empty stays empty. */
export function groupDigits(digits: string): string {
  return digits === "" ? "" : Number(digits).toLocaleString("en-IN");
}

/**
 * A rupee amount box. Shows commas while you type (28,000) and only ever keeps whole digits:
 * no minus sign, no decimals, no letters. `value` and `onChange` use plain digits ("28000").
 */
export function AmountInput({
  value, onChange, maxDigits = 9, className, ...rest
}: { value: string; onChange: (digits: string) => void; maxDigits?: number } & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <span className="relative block">
      <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">₹</span>
      <input
        {...rest}
        inputMode="numeric"
        autoComplete="off"
        className={cn(fieldClass, "pl-7", className)}
        value={groupDigits(value)}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, maxDigits))}
      />
    </span>
  );
}

/** "2026-11-26" -> "26 Nov 2026" */
export function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * A date box that always reads the Indian way ("26 Nov 2026"), whatever the device's own setting.
 * It is still the browser's real date control underneath, so phones show their usual date picker.
 * While you are editing it, the browser's own boxes show; when you leave, the tidy date shows.
 */
export function DateField({ value, onChange, className, ...rest }: { value: string; onChange: (iso: string) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  const [editing, setEditing] = useState(false);
  return (
    <span className="relative block">
      <input
        {...rest}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setEditing(true)}
        onBlur={() => setEditing(false)}
        onClick={(e) => {
          // Open the calendar on any click, not only on the small icon.
          try {
            e.currentTarget.showPicker?.();
          } catch {
            /* some browsers only allow this in certain cases; the field still works */
          }
        }}
        className={cn(fieldClass, !editing && value && "date-quiet", className)}
      />
      {!editing && value && (
        <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">{longDate(value)}</span>
      )}
    </span>
  );
}
