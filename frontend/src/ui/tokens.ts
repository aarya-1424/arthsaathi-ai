/** The same colours as the @theme block in index.css. Used for contrast tests and charts. */
export const colors = {
  ink950: "#0b1311",
  ink900: "#101a17",
  ink850: "#13201c",
  ink800: "#182822",
  line: "#23332d",
  lineStrong: "#2c4a3e",
  text: "#e8f0ec",
  muted: "#8fa39a",
  mint: "#3ddc97",
  mintHover: "#5fe5ab",
  onMint: "#06281a",
  warn: "#f5b547",
  danger: "#f26d6d",
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
