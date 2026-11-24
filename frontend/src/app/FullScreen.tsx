import type { ReactNode } from "react";
import { GlowBackground } from "../ui/components";

/** A centred full-screen message on the dark background (loading, errors). */
export function FullScreen({ children }: { children: ReactNode }) {
  return (
    <main className="theme-dark relative isolate flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <GlowBackground />
      {children}
    </main>
  );
}
