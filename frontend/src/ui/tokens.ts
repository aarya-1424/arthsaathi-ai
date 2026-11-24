/** The same colours as the @theme block in index.css. Used for contrast tests and charts. */
export const colors = {
  ink950: "#121212", // page
  ink900: "#171717", // sunken
  ink850: "#1c1c1c", // cards
  ink800: "#242424", // raised cards, inputs
  line: "#2e2e2e", // borders
  lineStrong: "#3d3d3d",
  text: "#f2f1ee",
  muted: "#a39f99",
  accent: "#ff6a2b", // ArthSaathi orange: brand, buttons, charts
  accentHover: "#ff8450",
  onAccent: "#1f0b02", // dark text on orange (white on orange is hard to read)
  success: "#4ade80", // on track
  warn: "#facc15", // close to limit
  danger: "#f87171", // over limit, errors
} as const;

/** WCAG contrast ratio between two hex colours (1 to 21). 4.5+ is needed for normal text. */
export function contrastRatio(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
