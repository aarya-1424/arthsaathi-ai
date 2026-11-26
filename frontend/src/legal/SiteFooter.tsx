import { Link } from "react-router-dom";

/** Shown publicly only when set (VITE_CONTACT_EMAIL). We never invent a contact address. */
export const CONTACT_EMAIL = ((import.meta.env.VITE_CONTACT_EMAIL as string | undefined) ?? "").trim();

const link = "underline-offset-4 transition hover:text-text hover:underline";

/** The small footer on public pages: legal links, contact and the short legal note. */
export function SiteFooter() {
  return (
    <footer className="flex flex-col gap-4 border-t border-line pt-6 text-xs text-muted">
      <nav aria-label="Legal" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <Link to="/privacy" className={link}>Privacy Policy</Link>
        <Link to="/terms" className={link}>Terms of Use</Link>
        <Link to="/disclaimer" className={link}>Financial Disclaimer</Link>
        {CONTACT_EMAIL && <a href={`mailto:${CONTACT_EMAIL}`} className={link}>Contact</a>}
      </nav>
      <p className="max-w-3xl">
        ArthSaathi is an educational and planning tool. It is not a registered investment adviser, chartered accountant, bank
        or government body. For big financial decisions, please check with a qualified professional.
      </p>
      <p>© {new Date().getFullYear()} ArthSaathi</p>
    </footer>
  );
}
