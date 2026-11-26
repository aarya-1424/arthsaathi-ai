import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, GlowBackground } from "../ui/components";
import { Logo } from "../ui/Logo";
import { CONTACT_EMAIL, SiteFooter } from "./SiteFooter";

/**
 * Privacy, Terms and Disclaimer, written in plain language and matched to what the app does today.
 * IMPORTANT: these are honest first versions. A lawyer must review them before a public launch
 * (see docs/BEFORE_LAUNCH.md).
 */
export type LegalKind = "privacy" | "terms" | "disclaimer";

type Section = { heading: string; points: string[] };
type Doc = { title: string; intro: string; sections: Section[] };

const UPDATED = "26 November 2026";

const contactLine = CONTACT_EMAIL
  ? `Write to us at ${CONTACT_EMAIL}.`
  : "Contact details will be listed here before ArthSaathi opens to the public.";

const DOCS: Record<LegalKind, Doc> = {
  privacy: {
    title: "Privacy Policy",
    intro: "Your money details are personal. This page explains, in plain words, what ArthSaathi stores, why, and what control you have.",
    sections: [
      {
        heading: "What we store",
        points: [
          "Your account: your email address and the name you ask us to call you. Your password is handled by our login provider and is never visible to us.",
          "Your profile answers: for example your occupation, state, monthly income and expenses, goals and comfort level. Optional questions can be left empty.",
          "What you record: the income and expense entries and the budgets you add yourself.",
        ],
      },
      {
        heading: "What we never ask for or collect",
        points: [
          "Bank passwords, UPI PIN, OTPs, card numbers or card PINs.",
          "A connection to your bank account. ArthSaathi only knows what you type in.",
          "Advertising or tracking data. ArthSaathi does not run ads or ad trackers.",
        ],
      },
      {
        heading: "How we use it",
        points: [
          "Only to run the app for you: to show your totals, charts, budgets and next steps.",
          "We do not sell your data, and we do not share it for advertising.",
        ],
      },
      {
        heading: "Where it is kept and who can see it",
        points: [
          "Your data is stored in a database hosted by Supabase in Mumbai, India. The website is served by Vercel and the app server runs on Render.",
          "Each account can only read and change its own data. This rule is enforced inside the database itself.",
          "Data travels over encrypted connections (HTTPS).",
          "Access to the database is limited to the small team that runs ArthSaathi, and is used only to operate and fix the service.",
        ],
      },
      {
        heading: "Your choices",
        points: [
          "You can change your profile and edit or delete any entry or budget at any time inside the app.",
          `You can ask us to delete your account and everything stored with it. ${contactLine}`,
        ],
      },
      {
        heading: "Younger users",
        points: ["If you are under 18, please use ArthSaathi with the guidance of a parent or guardian."],
      },
      {
        heading: "Changes and contact",
        points: [
          "If this policy changes in an important way, we will update this page and its date.",
          `Questions about your privacy? ${contactLine}`,
        ],
      },
    ],
  },
  terms: {
    title: "Terms of Use",
    intro: "These are the simple rules for using ArthSaathi. By creating an account, you agree to them.",
    sections: [
      {
        heading: "What ArthSaathi is",
        points: [
          "ArthSaathi is a tool for understanding and planning your own money. It is for education and personal planning.",
          "It is an early version. Features may change, and some described features are still being built.",
        ],
      },
      {
        heading: "Your account",
        points: [
          "Use your own email address and keep your password private.",
          "You are responsible for what is entered through your account. The numbers ArthSaathi shows are only as accurate as the numbers you record.",
        ],
      },
      {
        heading: "Fair use",
        points: [
          "Do not try to access other people's data, break or overload the service, or use it for anything unlawful.",
          "We may suspend an account that does this.",
        ],
      },
      {
        heading: "No professional advice",
        points: [
          "ArthSaathi does not give investment, tax, legal or insurance advice, and does not sell financial products. See the Financial Disclaimer for details.",
          "Decisions you make about your money are your own.",
        ],
      },
      {
        heading: "Availability",
        points: [
          "We work to keep ArthSaathi running and your data safe, but the service is provided as it is, and may sometimes be slow or unavailable.",
          "You can stop using ArthSaathi at any time and ask for your account to be deleted.",
        ],
      },
      {
        heading: "Changes and contact",
        points: [
          "If these terms change in an important way, we will update this page and its date.",
          contactLine,
        ],
      },
    ],
  },
  disclaimer: {
    title: "Financial Disclaimer",
    intro: "Please read this before relying on anything ArthSaathi shows you.",
    sections: [
      {
        heading: "What ArthSaathi is not",
        points: [
          "ArthSaathi is not a SEBI-registered investment adviser, a chartered accountant, a bank, an insurer or a government body.",
          "It does not recommend specific investments, loans or insurance products, and it does not handle your money.",
        ],
      },
      {
        heading: "How to read what you see",
        points: [
          "Totals, charts, budgets and next steps are calculated from the amounts you enter. If an entry is missing or wrong, the result will be too.",
          "Examples such as the 50/30/20 split are common starting points shown for illustration. They are not advice for your situation.",
          "Nothing in ArthSaathi is a promise or guarantee of savings, returns or any financial result.",
        ],
      },
      {
        heading: "For important decisions",
        points: [
          "Before big decisions such as investing, borrowing, buying insurance or filing taxes, please check official sources and speak to a qualified professional.",
          "Rules, tax rates and government schemes change. Always confirm current details with the official source.",
        ],
      },
    ],
  },
};

export const LEGAL_TITLES: Record<LegalKind, string> = { privacy: DOCS.privacy.title, terms: DOCS.terms.title, disclaimer: DOCS.disclaimer.title };

export function LegalPage({ kind }: { kind: LegalKind }) {
  const doc = DOCS[kind];

  useEffect(() => {
    const before = document.title;
    document.title = `${doc.title} · ArthSaathi`;
    if (typeof window.scrollTo === "function") window.scrollTo({ top: 0 });
    return () => {
      document.title = before;
    };
  }, [doc.title]);

  return (
    <div className="theme-dark relative isolate min-h-dvh">
      <GlowBackground />
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
        <div className="flex items-center justify-between">
          <Link to="/" aria-label="ArthSaathi home" className="rounded-full"><Logo size={34} /></Link>
          <Link to="/" className="flex min-h-11 items-center gap-2 rounded-full px-3 text-sm text-muted transition hover:bg-ink-800 hover:text-text">
            <ArrowLeft size={16} aria-hidden="true" />Back to ArthSaathi
          </Link>
        </div>

        <main>
          <Card className="flex flex-col gap-8 p-6 sm:p-10">
            <header className="flex flex-col gap-3">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{doc.title}</h1>
              <p className="text-sm text-muted">Last updated: {UPDATED}</p>
              <p className="text-muted">{doc.intro}</p>
            </header>
            {doc.sections.map((s) => (
              <section key={s.heading} className="flex flex-col gap-3">
                <h2 className="text-lg font-semibold">{s.heading}</h2>
                <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-muted marker:text-accent">
                  {s.points.map((p) => <li key={p}>{p}</li>)}
                </ul>
              </section>
            ))}
          </Card>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}
