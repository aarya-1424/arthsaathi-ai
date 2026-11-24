import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn, GlowBackground } from "./components";

export type NavItem = { id: string; label: string; icon: LucideIcon };

/**
 * The app frame. No usual top bar:
 * - Computer (1024px+): floating glass rail on the left, Saathi panel on the right (1280px+).
 * - Phone/tablet: floating glass dock at the bottom with a round "Ask" button in the centre.
 */
export function AppShell(props: {
  items: NavItem[]; // shown in the rail/dock, in order
  ask: NavItem; // the centre button
  active: string;
  onNavigate: (id: string) => void;
  side?: ReactNode; // the Saathi panel
  children: ReactNode;
}) {
  const { items, ask, active, onNavigate } = props;
  const half = Math.ceil(items.length / 2);
  const AskIcon = ask.icon;

  return (
    <div className="theme-dark relative isolate min-h-dvh">
      <GlowBackground />

      {/* Computer: left rail */}
      <nav aria-label="Main" className="glass fixed top-1/2 left-4 z-20 hidden -translate-y-1/2 flex-col items-center gap-2 rounded-full p-2 lg:flex">
        {items.slice(0, half).map((item) => <RailButton key={item.id} item={item} active={active === item.id} onClick={() => onNavigate(item.id)} />)}
        <button
          type="button"
          onClick={() => onNavigate(ask.id)}
          aria-label={ask.label}
          aria-current={active === ask.id ? "page" : undefined}
          className="group relative my-1 flex h-12 w-12 items-center justify-center rounded-full bg-mint text-on-mint transition duration-200 hover:shadow-glow active:scale-95"
        >
          <AskIcon size={22} aria-hidden="true" />
          <Tooltip text={ask.label} />
        </button>
        {items.slice(half).map((item) => <RailButton key={item.id} item={item} active={active === item.id} onClick={() => onNavigate(item.id)} />)}
      </nav>

      <div className="mx-auto max-w-6xl px-4 pt-6 pb-32 lg:pr-6 lg:pb-10 lg:pl-28 xl:grid xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-6">
        <main>{props.children}</main>
        {props.side && (
          <aside aria-label="Saathi panel" className="mt-6 xl:sticky xl:top-6 xl:mt-0 xl:self-start">
            {props.side}
          </aside>
        )}
      </div>

      {/* Phone/tablet: bottom dock */}
      <nav aria-label="Main" className="glass fixed inset-x-4 bottom-4 z-20 mx-auto flex max-w-md items-center justify-around rounded-full px-2 py-2 lg:hidden">
        {items.slice(0, half).map((item) => <DockButton key={item.id} item={item} active={active === item.id} onClick={() => onNavigate(item.id)} />)}
        <button
          type="button"
          onClick={() => onNavigate(ask.id)}
          aria-label={ask.label}
          aria-current={active === ask.id ? "page" : undefined}
          className="-mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-mint text-on-mint shadow-glow ring-4 ring-ink-950 transition duration-200 active:scale-95"
        >
          <AskIcon size={24} aria-hidden="true" />
        </button>
        {items.slice(half).map((item) => <DockButton key={item.id} item={item} active={active === item.id} onClick={() => onNavigate(item.id)} />)}
      </nav>
    </div>
  );
}

function Tooltip({ text }: { text: string }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-full ml-3 rounded-lg border border-line bg-ink-800 px-2.5 py-1 text-xs whitespace-nowrap text-text opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"
    >
      {text}
    </span>
  );
}

function RailButton({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-11 w-11 items-center justify-center rounded-full transition duration-200 active:scale-95",
        active ? "bg-mint/15 text-mint" : "text-muted hover:bg-ink-800 hover:text-text",
      )}
    >
      <Icon size={20} aria-hidden="true" />
      <Tooltip text={item.label} />
    </button>
  );
}

function DockButton({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 min-w-14 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] transition duration-200 active:scale-95",
        active ? "text-mint" : "text-muted",
      )}
    >
      <Icon size={20} aria-hidden="true" />
      {item.label}
    </button>
  );
}
