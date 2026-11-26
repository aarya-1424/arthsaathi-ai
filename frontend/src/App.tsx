import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { FullScreen } from "./app/FullScreen";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import { NewPasswordScreen } from "./auth/AuthScreen";
import { Landing } from "./landing/Landing";
import { LegalPage } from "./legal/LegalPage";
import { authConfigured } from "./lib/supabase";
import { LogoMark } from "./ui/Logo";

// Signed-in screens are a separate download, fetched only after sign-in.
const SignedInApp = lazy(() => import("./app/SignedInApp"));

function Loading() {
  return (
    <FullScreen>
      <LogoMark size={44} />
    </FullScreen>
  );
}

function Gate() {
  const { session, loading, recovering } = useAuth();
  const { pathname } = useLocation();
  if (!authConfigured) {
    return (
      <FullScreen>
        <p role="alert">Login is not set up yet. Add the Supabase settings to frontend/.env.local.</p>
      </FullScreen>
    );
  }
  if (loading) return <Loading />;
  if (recovering) return <NewPasswordScreen />;
  // Signed-out visitors only have the landing page; any app address sends them there.
  if (!session) return pathname === "/" ? <Landing /> : <Navigate to="/" replace />;
  return (
    <Suspense fallback={<Loading />}>
      <SignedInApp />
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public pages: readable with or without an account */}
          <Route path="/privacy" element={<LegalPage kind="privacy" />} />
          <Route path="/terms" element={<LegalPage kind="terms" />} />
          <Route path="/disclaimer" element={<LegalPage kind="disclaimer" />} />
          <Route path="*" element={<Gate />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
