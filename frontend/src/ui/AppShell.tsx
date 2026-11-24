import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn, GlowBackground } from "./components";
import { Logo, LogoMark } from "./Logo";

export type NavItem = { id: string; label: string; icon: LucideIcon };

/**
 * The app frame (after sign-in):
 * - Computer (1024px+): a floating side panel on the left with icons and names; Saathi panel on the right (1280px+).
 * - Phone/tablet: a small top bar, and a bottom tab bar with the orange "Ask" button in the middle.
 */
export function AppShell(props: {
  items: NavItem[]; // menu items, in order
  ask: NavItem; // the Ask button
  active: string;
  onNavigate: (id: string) => void;
  side?: ReactNode; // the Saathi panel
  account?: ReactNode; // shown at the bottom of the side panel (name, sign out)
  children: ReactNode;
}) {
  const { items, ask, active, onNavigate } = props;
  const half = Math.ceil(items.length / 2);
  const AskIcon = ask.icon;

  return (
    <div className="theme-dark relative isolate min-h-dvh">
      <GlowBackground />

      {/* Computer: side panel */}
      <aside className="fixed top-4 bottom-4 left-4 z-20 hidden w-60 flex-col gap-6 rounded-3xl border border-line bg-ink-900/90 p-4 shadow-soft lg:flex">
        <div className="px-2 pt-1"><Logo size={34} /></div>
        <button
          type="button"
          onClick={() => onNavigate(ask.id)}
          aria-current={active === ask.id ? "page" : undefined}
          className="flex min-h-12 items-center gap-3 rounded-2xl bg-accent px-4 font-semibold text-on-accent transition duration-200 hover:bg-accent-hover hover:shadow-glow active:scale-[0.98]"
        >
          <AskIcon size={20} aria-hidden="true" />
          {ask.label}
        </button>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {items.map((item) => {
            const Icon = item.icon;
            const on = active === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition duration-200 active:scale-[0.98]",
                  on ? "bg-ink-800 font-semibold text-text" : "text-muted hover:bg-ink-850 hover:text-text",
                )}
              >
                {on && <span aria-hidden="true" className="absolute top-2.5 bottom-2.5 left-0 w-1 rounded-full bg-accent" />}
                <Icon size={19} aria-hidden="true" className={on ? "text-accent" : undefined} />
                {item.label}
              </button>
            );
          })}
        </nav>
        {props.account && <div className="mt-auto border-t border-line pt-4">{props.account}</div>}
      </aside>

      {/* Phone/tablet: small top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-ink-950/85 px-4 py-3 backdrop-blur lg:hidden">
        <Logo size={30} />
      </header>

      <div className="mx-auto max-w-6xl px-4 pt-6 pb-32 sm:px-6 lg:pt-8 lg:pr-8 lg:pb-12 lg:pl-72 xl:grid xl:max-w-[90rem] xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-6">
        <main>{props.children}</main>
        {props.side && (
          <aside aria-label="Saathi panel" className="mt-6 xl:sticky xl:top-8 xl:mt-0 xl:self-start">
            {props.side}
          </aside>
        )}
      </div>

      {/* Phone/tablet: bottom tab bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 flex items-end justify-around border-t border-line bg-ink-900/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden"
      >
        {items.slice(0, half).map((item) => <TabButton key={item.id} item={item} active={active === item.id} onClick={() => onNavigate(item.id)} />)}
        <button
          type="button"
          onClick={() => onNavigate(ask.id)}
          aria-label={ask.label}
          aria-current={active === ask.id ? "page" : undefined}
          className="-mt-7 mb-1 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-on-accent shadow-glow ring-4 ring-ink-950 transition duration-200 active:scale-95"
        >
          <AskIcon size={24} aria-hidden="true" />
        </button>
        {items.slice(half).map((item) => <TabButton key={item.id} item={item} active={active === item.id} onClick={() => onNavigate(item.id)} />)}
      </nav>
    </div>
  );
}

function TabButton({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-12 min-w-16 flex-col items-center justify-center gap-1 rounded-xl text-[11px] transition duration-200 active:scale-95",
        active ? "font-semibold text-accent" : "text-muted",
      )}
    >
      <Icon size={21} aria-hidden="true" />
      {item.label}
    </button>
  );
}

export { LogoMark };
