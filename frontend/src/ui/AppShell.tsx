import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { cn, GlowBackground } from "./components";
import { Logo } from "./Logo";

export type NavItem = { to: string; label: string; icon: LucideIcon };

/**
 * The app frame (after sign-in). Menu items are real links, so the browser's Back button,
 * Refresh and "open in new tab" all work.
 * - Computer (1024px+): a floating side panel on the left; Saathi panel on the right (1280px+).
 * - Phone/tablet: a small top bar, a bottom tab bar, and a round main-action button above it.
 */
export function AppShell(props: {
  items: NavItem[]; // menu items, in order
  action: { label: string; icon: LucideIcon; onClick: () => void }; // the main orange button
  side?: ReactNode; // the Saathi panel
  account?: ReactNode; // shown at the bottom of the side panel (name, sign out)
  children: ReactNode;
}) {
  const { items, action } = props;
  const ActionIcon = action.icon;

  return (
    <div className="theme-dark relative isolate min-h-dvh">
      <GlowBackground />

      {/* Computer: side panel */}
      <aside className="fixed top-4 bottom-4 left-4 z-20 hidden w-60 flex-col gap-6 rounded-3xl border border-line bg-ink-900/90 p-4 shadow-soft lg:flex">
        <Link to="/" aria-label="ArthSaathi home" className="w-fit rounded-full px-2 pt-1"><Logo size={34} /></Link>
        <button
          type="button"
          onClick={action.onClick}
          className="flex min-h-12 items-center gap-3 rounded-2xl bg-accent px-4 font-semibold text-on-accent transition duration-200 hover:bg-accent-hover hover:shadow-glow active:scale-[0.98]"
        >
          <ActionIcon size={20} aria-hidden="true" />
          {action.label}
        </button>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) => cn(
                  "group relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition duration-200 active:scale-[0.98]",
                  isActive ? "bg-ink-800 font-semibold text-text" : "text-muted hover:bg-ink-850 hover:text-text",
                )}
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span aria-hidden="true" className="absolute top-2.5 bottom-2.5 left-0 w-1 rounded-full bg-accent" />}
                    <Icon size={19} aria-hidden="true" className={isActive ? "text-accent" : undefined} />
                    {item.label}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
        {props.account && <div className="mt-auto border-t border-line pt-4">{props.account}</div>}
      </aside>

      {/* Phone/tablet: small top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-ink-950/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link to="/" aria-label="ArthSaathi home" className="rounded-full"><Logo size={30} /></Link>
      </header>

      <div className="mx-auto max-w-6xl px-4 pt-6 pb-36 sm:px-6 lg:pt-8 lg:pr-8 lg:pb-12 lg:pl-72 xl:grid xl:max-w-[90rem] xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-6">
        <main>{props.children}</main>
        {props.side && (
          <aside aria-label="Saathi panel" className="mt-6 xl:sticky xl:top-8 xl:mt-0 xl:self-start">
            {props.side}
          </aside>
        )}
      </div>

      {/* Phone/tablet: main action button, floating above the tab bar */}
      <button
        type="button"
        onClick={action.onClick}
        aria-label={action.label}
        className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-20 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-on-accent shadow-glow transition duration-200 active:scale-95 lg:hidden"
      >
        <ActionIcon size={24} aria-hidden="true" />
      </button>

      {/* Phone/tablet: bottom tab bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 flex items-stretch justify-around border-t border-line bg-ink-900/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden"
      >
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => cn(
                "flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[11px] transition duration-200 active:scale-95",
                isActive ? "font-semibold text-accent" : "text-muted",
              )}
            >
              <Icon size={21} aria-hidden="true" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
