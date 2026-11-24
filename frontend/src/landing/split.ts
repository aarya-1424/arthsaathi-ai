/**
 * The common "50/30/20" starting rule: 50% needs, 30% wants, 20% savings.
 * Used ONLY as a clearly labelled example on the landing page. It is not advice.
 * Whole rupees; the three parts always add up exactly to the income.
 */
export type Split = { needs: number; wants: number; savings: number };

export const MAX_DEMO_INCOME = 10_000_000; // ₹1 crore a month is plenty for a demo

export function split503020(income: number): Split {
  const safe = Number.isFinite(income) ? Math.min(Math.max(Math.floor(income), 0), MAX_DEMO_INCOME) : 0;
  const needs = Math.round(safe * 0.5);
  const wants = Math.round(safe * 0.3);
  return { needs, wants, savings: safe - needs - wants };
}
