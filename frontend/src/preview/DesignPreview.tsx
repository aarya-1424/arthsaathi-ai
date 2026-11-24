import { lazy, Suspense } from "react";
import { AuthProvider } from "../auth/AuthProvider";
import { installSampleApi } from "./sampleApi";

/**
 * DEVELOPMENT ONLY: open http://localhost:5173/#/design
 * Shows the real signed-in app filled with SAMPLE data (a pretend user "Rahul").
 * Nothing is saved and nothing is sent to the real server.
 */
installSampleApi();
const SignedInApp = lazy(() => import("../app/SignedInApp"));

export function DesignPreview() {
  return (
    <AuthProvider>
      <div className="pointer-events-none fixed top-3 right-3 z-50 rounded-full bg-warn px-3 py-1 text-xs font-semibold text-[#1a1400]">
        Preview · sample data
      </div>
      <Suspense fallback={null}>
        <SignedInApp />
      </Suspense>
    </AuthProvider>
  );
}
