import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  RedirectToSignIn,
} from "@clerk/clerk-react";
import {
  BrowserRouter,
  Route,
  Routes,
  useNavigate,
  Navigate,
} from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider, useLanguage } from "@/context/LanguageContext";
import { ThreatGlobe } from "@/components/ThreatGlobe";
import { AudioUpload } from "@/components/AudioUpload";
import { LiveMonitor } from "@/components/LiveMonitor";
import { DeepfakeGame } from "@/components/DeepfakeGame";
import { Landing } from "./pages/Landing";
import { Navbar } from "@/components/Navbar";
import { useState, lazy, Suspense } from "react";

const History = lazy(() =>
  import("./pages/History").then((module) => ({ default: module.History })),
);
// Note: If History is default export, use: lazy(() => import("./pages/History"))
// I'll assume they are named exports based on current import { History }

const SpeakerIdentity = lazy(() =>
  import("@/components/SpeakerIdentity").then((module) => ({
    default: module.SpeakerIdentity,
  })),
);

// TODO: Move to env
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  console.error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const queryClient = new QueryClient();

function Dashboard() {
  const [mode, setMode] = useState<
    "analysis" | "identity" | "monitor" | "game"
  >("analysis");
  const { t } = useLanguage();

  return (
    <div className="p-4 md:p-8 max-w-full mx-auto pt-24 min-h-screen relative overflow-x-hidden">
      {/* Feature Toggles (Sticky Top) */}
      <div className="flex justify-center w-full sticky top-4 z-50 mb-8 md:mb-12">
        <div className="bg-secondary/80 backdrop-blur-xl p-1.5 rounded-full flex flex-wrap justify-center gap-2 border border-border/50 shadow-2xl transition-all hover:scale-[1.01]">
          <button
            onClick={() => setMode("analysis")}
            className={`px-4 py-2 md:px-6 md:py-2.5 rounded-full font-medium text-sm md:text-base transition-all duration-300 flex items-center gap-2 ${mode === "analysis" ? "bg-background shadow-sm text-foreground ring-1 ring-border" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t("toggle.detector")}
          </button>
          <button
            onClick={() => setMode("identity")}
            className={`px-4 py-2 md:px-6 md:py-2.5 rounded-full font-medium text-sm md:text-base transition-all duration-300 flex items-center gap-2 ${mode === "identity" ? "bg-background shadow-sm text-foreground ring-1 ring-border" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t("toggle.identity")}
          </button>
          <button
            onClick={() => setMode("monitor")}
            className={`px-4 py-2 md:px-6 md:py-2.5 rounded-full font-medium text-sm md:text-base transition-all duration-300 flex items-center gap-2 ${mode === "monitor" ? "bg-background shadow-sm text-foreground ring-1 ring-border" : "text-muted-foreground hover:text-foreground"}`}
          >
            🎙️ Live Monitor
          </button>
          <button
            onClick={() => setMode("game")}
            className={`px-4 py-2 md:px-6 md:py-2.5 rounded-full font-medium text-sm md:text-base transition-all duration-300 flex items-center gap-2 ${mode === "game" ? "bg-background shadow-sm text-foreground ring-1 ring-border" : "text-muted-foreground hover:text-foreground"}`}
          >
            🎮 Challenge
          </button>
        </div>
      </div>

      {/* AMBIENT GLOBE - Fixed to Right Side (Hidden on mobile, visible on lg) */}
      <div className="fixed top-20 right-[-150px] lg:right-[-50px] w-[500px] h-[500px] lg:w-[600px] lg:h-[600px] z-0 pointer-events-none opacity-30 lg:opacity-60 hidden md:block">
        <div className="absolute inset-0 bg-gradient-to-l from-primary/10 to-transparent blur-[80px] rounded-full"></div>
        <ThreatGlobe />
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 w-full max-w-5xl mx-auto lg:pr-[300px]">
        <div className="animate-in slide-in-from-bottom-8 duration-700 ease-out">
          {mode === "analysis" && (
            <div className="space-y-8">
              <div className="text-left space-y-2">
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                  New Analysis
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl">
                  Detect deepfakes with advanced spectral processing.
                </p>
              </div>

              <div className="bg-card/50 backdrop-blur-sm border rounded-3xl p-1 shadow-xl">
                <AudioUpload />
              </div>
            </div>
          )}

          {mode === "identity" && (
            <Suspense
              fallback={
                <div className="p-12 text-center text-xl text-muted-foreground">
                  Initializing Identity Neural Net...
                </div>
              }
            >
              <SpeakerIdentity />
            </Suspense>
          )}

          {mode === "monitor" && <LiveMonitor />}

          {mode === "game" && <DeepfakeGame />}
        </div>
      </div>
    </div>
  );
}

function ClerkProviderWithRoutes() {
  const navigate = useNavigate();

  if (!PUBLISHABLE_KEY) {
    return (
      <div className="flex bg-destructive/10 h-screen items-center justify-center flex-col gap-4 p-4 text-center">
        <h1 className="text-4xl font-bold text-destructive">
          Configuration Error
        </h1>
        <p className="text-lg">
          Missing <code>VITE_CLERK_PUBLISHABLE_KEY</code> in{" "}
          <code>apps/web/.env</code>
        </p>
        <p>Please add your Clerk Publishable Key to continue.</p>
      </div>
    );
  }

  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      navigate={(to) => navigate(to)}
    >
      <Navbar />
      <Suspense
        fallback={
          <div className="flex justify-center items-center h-screen">
            Loading...
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Landing />} />
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
        </Routes>
      </Suspense>
    </ClerkProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="satark-ui-theme">
        <LanguageProvider>
          <BrowserRouter>
            <ClerkProviderWithRoutes />
          </BrowserRouter>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
