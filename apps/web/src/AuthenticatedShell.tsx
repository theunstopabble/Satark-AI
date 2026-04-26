import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  RedirectToSignIn,
  useSession,
} from "@clerk/clerk-react";
import { Route, Routes, useNavigate, Navigate, Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useState, useEffect, lazy, Suspense } from "react";
import { useLanguage } from "@/context/LanguageContext";

// ── All heavy dashboard components lazy loaded ──
const ImageUpload = lazy(() =>
  import("@/components/ImageUpload").then((m) => ({ default: m.ImageUpload })),
);
const AudioUpload = lazy(() =>
  import("@/components/AudioUpload").then((m) => ({ default: m.AudioUpload })),
);
const LiveMonitor = lazy(() =>
  import("@/components/LiveMonitor").then((m) => ({ default: m.LiveMonitor })),
);
const DeepfakeGame = lazy(() =>
  import("@/components/DeepfakeGame").then((m) => ({
    default: m.DeepfakeGame,
  })),
);
const History = lazy(() =>
  import("./pages/History").then((m) => ({ default: m.History })),
);
const SpeakerIdentity = lazy(() =>
  import("@/components/SpeakerIdentity").then((m) => ({
    default: m.SpeakerIdentity,
  })),
);

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  console.error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

function LoadingSpinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-col justify-center items-center h-screen gap-3">
      <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  FIX: AuthGate — THE CORE FIX FOR "REFRESH = LOGOUT" BUG  ║
// ║                                                              ║
// ║  Problem: ClerkProvider session check is ASYNC. During the   ║
// ║  loading phase, SignedOut fires → RedirectToSignIn triggers  ║
// ║  BEFORE Clerk finishes verifying the session cookie.         ║
// ║                                                              ║
// ║  Solution: useSession() ka isLoaded flag check karo. Jab     ║
// ║  tak Clerk fully loaded nahi, kuch mat render karo — sirf   ║
// ║  loading spinner dikhao.                                     ║
// ╚══════════════════════════════════════════════════════════════╝
function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useSession();

  // Sync auth state to localStorage so LandingNavbar can read it
  // without importing Clerk SDK
  useEffect(() => {
    if (!isLoaded) return;
    try {
      if (isSignedIn) {
        localStorage.setItem("satark_auth_flag", "true");
      } else {
        localStorage.removeItem("satark_auth_flag");
      }
    } catch {
      // localStorage not available
    }
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) {
    return <LoadingSpinner label="Verifying session..." />;
  }

  return <>{children}</>;
}

function Dashboard() {
  const [mode, setMode] = useState<
    "analysis" | "identity" | "monitor" | "game" | "image"
  >("analysis");
  const { t } = useLanguage();

  return (
    <div className="p-4 md:p-8 max-w-full min-h-screen relative overflow-x-hidden font-sans selection:bg-primary/20">
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="relative z-10 w-full max-w-6xl mx-auto pt-20 lg:pt-24 space-y-8">
        <div className="flex justify-center w-full sticky top-4 z-50">
          <div className="bg-background/80 backdrop-blur-xl p-1.5 rounded-full flex flex-wrap justify-center gap-2 border border-border/50 shadow-sm ring-1 ring-border/20 transition-all hover:shadow-md">
            <button
              onClick={() => setMode("analysis")}
              className={`px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-300 flex items-center gap-2 ${mode === "analysis" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
            >
              {t("toggle.detector")}
            </button>
            <button
              onClick={() => setMode("identity")}
              className={`px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-300 flex items-center gap-2 ${mode === "identity" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
            >
              {t("toggle.identity")}
            </button>
            <button
              onClick={() => setMode("monitor")}
              className={`px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-300 flex items-center gap-2 ${mode === "monitor" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
            >
              Live Monitor
            </button>
            <button
              onClick={() => setMode("game")}
              className={`px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-300 flex items-center gap-2 ${mode === "game" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
            >
              Challenge
            </button>
            <button
              onClick={() => setMode("image")}
              className={`px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-300 flex items-center gap-2 ${
                mode === "image"
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              Image Scan
            </button>
          </div>
        </div>

        <div className="w-full max-w-4xl mx-auto animate-in slide-in-from-bottom-8 duration-700 ease-out">
          <Suspense fallback={<LoadingSpinner label="Loading module..." />}>
            {mode === "analysis" && (
              <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-[2rem] p-1 shadow-xl">
                <AudioUpload />
              </div>
            )}
            {mode === "identity" && <SpeakerIdentity />}
            {mode === "monitor" && <LiveMonitor />}
            {mode === "game" && <DeepfakeGame />}
            {mode === "image" && <ImageUpload />}
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function ClerkRoutes() {
  const navigate = useNavigate();

  if (!PUBLISHABLE_KEY) {
    return (
      <div className="flex bg-destructive/10 h-screen items-center justify-center flex-col gap-4 p-4 text-center">
        <h1 className="text-4xl font-bold text-destructive">
          Configuration Error
        </h1>
        <p className="text-lg">
          Missing <code>VITE_CLERK_PUBLISHABLE_KEY</code>
        </p>
      </div>
    );
  }

  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      navigate={(to: string) => navigate(to)}
    >
      <Navbar />

      {/* FIX: AuthGate wraps all routes — Clerk ke load hone tak koi auth decision nahi hoga */}
      <AuthGate>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route
              path="/sign-in/*"
              element={
                <>
                  <SignedIn>
                    <Navigate to="/dashboard" replace />
                  </SignedIn>
                  <SignedOut>
                    <RedirectToSignIn afterSignInUrl="/dashboard" />
                  </SignedOut>
                </>
              }
            />
            <Route
              path="/sign-up/*"
              element={
                <>
                  <SignedIn>
                    <Navigate to="/dashboard" replace />
                  </SignedIn>
                  <SignedOut>
                    <RedirectToSignIn afterSignInUrl="/dashboard" />
                  </SignedOut>
                </>
              }
            />
            <Route
              path="/dashboard"
              element={
                <>
                  <SignedIn>
                    <Dashboard />
                  </SignedIn>
                  <SignedOut>
                    <RedirectToSignIn />
                  </SignedOut>
                </>
              }
            />
            <Route
              path="/dashboard/history"
              element={
                <>
                  <SignedIn>
                    <History />
                  </SignedIn>
                  <SignedOut>
                    <RedirectToSignIn />
                  </SignedOut>
                </>
              }
            />
            <Route
              path="*"
              element={
                <div className="flex flex-col items-center justify-center h-screen gap-4">
                  <h1 className="text-4xl font-bold">404</h1>
                  <p className="text-muted-foreground">Page not found</p>
                  <Link
                    to="/dashboard"
                    className="text-primary hover:underline"
                  >
                    Go to Dashboard
                  </Link>
                </div>
              }
            />
          </Routes>
        </Suspense>
      </AuthGate>

      <Footer />
    </ClerkProvider>
  );
}

export default ClerkRoutes;
