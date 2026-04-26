import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/context/LanguageContext";
import { Landing } from "./pages/Landing";
import { LandingNavbar } from "@/components/LandingNavbar";
import { Footer } from "@/components/Footer";
import { Suspense, lazy, Component, type ReactNode } from "react";
import { Analytics } from "@vercel/analytics/react";

/**
 * FIX #1: ErrorBoundary added — agar Clerk ya koi bhi lazy chunk fail ho,
 * app crash nahi hoga, graceful error screen dikhega.
 */

const AuthenticatedShell = lazy(() => import("./AuthenticatedShell"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

// ── FIX: Error Boundary for lazy-loaded route chunks ──
class RouteErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Route Error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen gap-4 p-4 text-center">
          <h1 className="text-4xl font-bold text-destructive">
            Something went wrong
          </h1>
          <p className="text-muted-foreground max-w-md">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.href = "/";
            }}
            className="text-primary hover:underline mt-2"
          >
            Go Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function LandingPageShell() {
  return (
    <>
      <LandingNavbar />
      <Landing />
      <Footer />
    </>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex flex-col justify-center items-center h-screen gap-3">
      <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="satark-ui-theme">
        <LanguageProvider>
          <BrowserRouter>
            <Routes>
              {/* PUBLIC route - zero Clerk dependency */}
              <Route path="/" element={<LandingPageShell />} />

              {/* ALL auth routes - Clerk loads lazily only when user navigates here */}
              <Route
                path="/*"
                element={
                  <RouteErrorBoundary>
                    <Suspense fallback={<LoadingSpinner />}>
                      <AuthenticatedShell />
                    </Suspense>
                  </RouteErrorBoundary>
                }
              />
            </Routes>
          </BrowserRouter>
          <Analytics />
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
