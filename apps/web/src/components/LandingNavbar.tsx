import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { ModeToggle } from "./mode-toggle";
import { LanguageToggle } from "./language-toggle";
import { useLanguage } from "../context/LanguageContext";

/**
 * Lightweight navbar for the public landing page.
 * NO Clerk imports — keeps Clerk auth SDK off the critical path.
 *
 * FIX: Auth state check via localStorage flag set by AuthenticatedShell.
 * If user is already signed in, show "Dashboard" instead of "Sign In".
 * This prevents the confusing "click sign-in → auto-login" UX.
 */

const mobileMenuStyles = `
  .lnav-menu-enter {
    overflow: hidden;
    animation: lnavOpen 0.2s ease forwards;
  }
  @keyframes lnavOpen {
    from { opacity: 0; max-height: 0; }
    to { opacity: 1; max-height: 400px; }
  }
`;

// ── FIX: Check auth state without importing Clerk ──
// Clerk stores session in cookies, but we also set a flag in localStorage
// from AuthenticatedShell so LandingNavbar can check it instantly.
function useIsSignedIn(): boolean {
  const [signedIn, setSignedIn] = useState(() => {
    try {
      return localStorage.getItem("satark_auth_flag") === "true";
    } catch {
      return false;
    }
  });

  // Listen for storage changes (e.g., sign-in in another tab)
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === "satark_auth_flag") {
        setSignedIn(e.newValue === "true");
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  // Also re-check on mount (in case flag was set in same tab before navigation)
  useEffect(() => {
    try {
      setSignedIn(localStorage.getItem("satark_auth_flag") === "true");
    } catch {
      // ignore
    }
  }, []);

  return signedIn;
}

export function LandingNavbar() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const isSignedIn = useIsSignedIn();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur-xl shadow-sm">
      <style>{mobileMenuStyles}</style>
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 sm:h-20 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2 font-bold hover:opacity-80 transition-opacity"
        >
          <img
            src="/logo.webp"
            alt="Satark-AI Logo"
            className="w-10 h-10 object-contain"
            width={40}
            height={40}
            {...({ fetchpriority: "high" } as any)}
          />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-400 dark:to-cyan-300 whitespace-nowrap text-lg md:text-2xl font-bold">
            {t("brand.name")}
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-4">
          {/* FIX: Agar signed in hai toh Dashboard dikhao, nahi toh Sign In */}
          {isSignedIn ? (
            <Link
              to="/dashboard"
              className="px-5 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-full hover:bg-primary/90 transition-all active:scale-95"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/sign-in"
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                {t("nav.signin")}
              </Link>
              <Link
                to="/sign-up"
                className="px-5 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-full hover:bg-primary/90 transition-all active:scale-95"
              >
                {t("nav.getstarted")}
              </Link>
            </>
          )}
          <LanguageToggle />
          <ModeToggle />
        </div>

        {/* Mobile */}
        <div className="flex items-center gap-2 md:hidden">
          <ModeToggle />
          <button
            className="p-2 text-foreground hover:bg-muted rounded-lg transition-colors"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle mobile menu"
            aria-expanded={isOpen}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="lnav-menu-enter md:hidden border-b bg-background/95 backdrop-blur-xl">
          <div className="p-6 flex flex-col gap-3">
            {/* FIX: Mobile menu mein bhi same logic */}
            {isSignedIn ? (
              <Link
                to="/dashboard"
                className="w-full text-center py-3 bg-primary text-primary-foreground rounded-xl font-bold"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/sign-in"
                  className="w-full text-center py-3 rounded-xl hover:bg-muted transition-colors font-medium"
                >
                  {t("nav.signin")}
                </Link>
                <Link
                  to="/sign-up"
                  className="w-full text-center py-3 bg-primary text-primary-foreground rounded-xl font-bold"
                >
                  {t("nav.getstarted")}
                </Link>
              </>
            )}
            <div className="flex justify-between items-center pt-3 border-t">
              <span className="text-sm font-medium">Language</span>
              <LanguageToggle />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
