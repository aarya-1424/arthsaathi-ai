import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";
import { colors, contrastRatio } from "./tokens";

const AA_TEXT = 4.5; // WCAG minimum for normal text

test.each([
  ["main text on page", colors.text, colors.ink950],
  ["main text on card", colors.text, colors.ink850],
  ["main text on raised card", colors.text, colors.ink800],
  ["supporting text on page", colors.muted, colors.ink950],
  ["supporting text on card", colors.muted, colors.ink850],
  ["supporting text on raised card", colors.muted, colors.ink800],
  ["orange text on card", colors.accent, colors.ink850],
  ["orange text on page", colors.accent, colors.ink950],
  ["text on orange button", colors.onAccent, colors.accent],
  ["text on orange hover", colors.onAccent, colors.accentHover],
  ["green 'on track' on card", colors.success, colors.ink850],
  ["yellow warning on card", colors.warn, colors.ink850],
  ["red error on card", colors.danger, colors.ink850],
  ["red error on page", colors.danger, colors.ink950],
])("%s is readable (contrast at least 4.5:1)", (_name, fg, bg) => {
  expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA_TEXT);
});

test("contrast maths matches known values", () => {
  expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 1);
});

test("index.css uses exactly the colours in tokens.ts", () => {
  const css = readFileSync(resolve(__dirname, "../index.css"), "utf8").toLowerCase();
  for (const hex of Object.values(colors)) expect(css).toContain(hex);
});
