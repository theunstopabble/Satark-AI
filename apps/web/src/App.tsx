import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/context/LanguageContext";
import { Landing } from "./pages/Landing";
import { LandingNavbar } from "@/components/LandingNavbar";
import { Footer } from "@/components/Footer";
import { Suspense, lazy } from "react";

/**
 * Core strategy:
 * - Landing page ("/") renders IMMEDIATELY with zero Clerk JS on the critical path.
 * - Clerk + all auth components are lazy-loaded in AuthenticatedShell, which only
 *   activates when user navigates to /dashboard, /sign-in, /sign-up, etc.
 * - This removes ~200KB of Clerk JS from the landing page's initial load.
 */

// Heavy authenticated subtree - Clerk + entire dashboard - loaded on demand only
const AuthenticatedShell = lazy(() => import("./AuthenticatedShell"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

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
                  <Suspense fallback={<LoadingSpinner />}>
                    <AuthenticatedShell />
                  </Suspense>
                }
              />
            </Routes>
          </BrowserRouter>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
