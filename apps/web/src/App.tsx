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
  const [mode, setMode] = useState<"analysis" | "identity" | "monitor">(
    "analysis",
  );
  const { t } = useLanguage();

  return (
    <div className="p-8 max-w-7xl mx-auto pt-24 space-y-8 animate-in fade-in duration-500">
      {/* Feature Toggle */}
      <div className="flex flex-col items-center gap-8 relative">
        {/* Globe as Background/Hero Element */}
        <div className="md:absolute top-[-50px] z-0 opacity-60 hover:opacity-100 transition-opacity duration-1000">
          <ThreatGlobe />
        </div>

        {/* Spacing for Globe */}
        <div className="hidden md:block h-[350px]"></div>

        <div className="bg-secondary/80 backdrop-blur-md p-1.5 rounded-full flex flex-wrap justify-center gap-2 border border-border/50 shadow-2xl relative z-10 w-full max-w-fit mx-auto">
          <button
            onClick={() => setMode("analysis")}
            className={`px-6 py-2.5 rounded-full font-medium transition-all duration-300 flex items-center gap-2 ${mode === "analysis" ? "bg-background shadow-sm text-foreground ring-1 ring-border" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t("toggle.detector")}
          </button>
          <button
            onClick={() => setMode("identity")}
            className={`px-6 py-2.5 rounded-full font-medium transition-all duration-300 flex items-center gap-2 ${mode === "identity" ? "bg-background shadow-sm text-foreground ring-1 ring-border" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t("toggle.identity")}
          </button>
          <button
            onClick={() => setMode("monitor")}
            className={`px-6 py-2.5 rounded-full font-medium transition-all duration-300 flex items-center gap-2 ${mode === "monitor" ? "bg-background shadow-sm text-foreground ring-1 ring-border" : "text-muted-foreground hover:text-foreground"}`}
          >
            🎙️ Live Monitor
          </button>
          <button
            onClick={() => setMode("game")}
            className={`px-6 py-2.5 rounded-full font-medium transition-all duration-300 flex items-center gap-2 ${mode === "game" ? "bg-background shadow-sm text-foreground ring-1 ring-border" : "text-muted-foreground hover:text-foreground"}`}
          >
            🎮 Challenge
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto min-h-[600px]">
        {mode === "analysis" && <AudioUpload />}

        {mode === "identity" && (
          <Suspense
            fallback={
              <div className="text-center py-20">
                Loading Identity Module...
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
