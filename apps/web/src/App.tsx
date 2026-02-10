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
    <div className="p-4 md:p-8 max-w-full min-h-screen relative overflow-x-hidden font-sans selection:bg-primary/20">
      {/* THREAT GLOBE - Widget Style (Not cut off) */}
      {/* Fixed: Fully visible, smaller, clear of navbar, not touching right edge */}
      <div className="fixed top-36 right-4 lg:right-10 w-[250px] h-[250px] lg:w-[350px] lg:h-[350px] z-0 hidden md:block animate-in fade-in duration-1000">
        {/* Subtle Glow behind it */}
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent blur-[50px] rounded-full"></div>
        <ThreatGlobe />
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto pt-20 lg:pt-24 space-y-8">
        {/* Feature Toggles (Left Aligned & Sticky) */}
        <div className="flex justify-start w-full sticky top-4 z-50 pl-2">
          <div className="bg-background/80 backdrop-blur-xl p-1.5 rounded-full flex flex-wrap justify-start gap-2 border border-border/50 shadow-sm ring-1 ring-border/20 transition-all hover:shadow-md">
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
              🎙️ Live Monitor
            </button>
            <button
              onClick={() => setMode("game")}
              className={`px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-300 flex items-center gap-2 ${mode === "game" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
            >
              🎮 Challenge
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="w-full lg:max-w-3xl animate-in slide-in-from-bottom-8 duration-700 ease-out">
          {mode === "analysis" && (
            <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-[2rem] p-1 shadow-xl">
              <AudioUpload />
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
