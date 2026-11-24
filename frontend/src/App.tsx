import { lazy, Suspense } from "react";
import { FullScreen } from "./app/FullScreen";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import { NewPasswordScreen } from "./auth/AuthScreen";
import { Landing } from "./landing/Landing";
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
  if (!authConfigured) {
    return (
      <FullScreen>
        <p role="alert">Login is not set up yet. Add the Supabase settings to frontend/.env.local.</p>
      </FullScreen>
    );
  }
  if (loading) return <Loading />;
  if (recovering) return <NewPasswordScreen />;
  if (!session) return <Landing />;
  return (
    <Suspense fallback={<Loading />}>
      <SignedInApp />
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
