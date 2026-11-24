import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource/noto-sans-devanagari/400.css";
import "@fontsource/noto-sans-devanagari/600.css";
import App from "./App";
import "./index.css";

// Low-memory phones (2 GB or less) skip the heavy glass blur so the app stays smooth.
const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
if (memory !== undefined && memory <= 2) document.documentElement.classList.add("lite");

// The design preview exists only while developing (never in the live app).
const DesignPreview = import.meta.env.DEV
  ? lazy(() => import("./preview/DesignPreview").then((m) => ({ default: m.DesignPreview })))
  : null;
const showPreview = DesignPreview !== null && window.location.hash.startsWith("#/design");
if (DesignPreview !== null) {
  // Switching to or from #/design (or #/design-onboarding) reloads, so the right screen always shows.
  window.addEventListener("hashchange", () => {
    if ((window.location.hash.startsWith("#/design")) !== showPreview) window.location.reload();
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {showPreview && DesignPreview ? (
      <Suspense fallback={null}>
        <DesignPreview />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
