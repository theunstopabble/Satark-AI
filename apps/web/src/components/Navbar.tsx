import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { useState, useEffect } from "react";
import { ModeToggle } from "./mode-toggle";
import { LanguageToggle } from "./language-toggle";
import { useLanguage } from "../context/LanguageContext";
import { InstallPWA } from "./InstallPWA";

const mobileMenuStyles = `
  .mobile-menu-enter {
    overflow: hidden;
    animation: menuOpen 0.2s ease forwards;
  }
  @keyframes menuOpen {
    from { opacity: 0; max-height: 0; }
    to { opacity: 1; max-height: 500px; }
  }
`;

export function Navbar() {
  const location = useLocation();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 shadow-sm transition-all duration-300">
      <style>{mobileMenuStyles}</style>
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2 font-bold text-2xl hover:opacity-80 transition-opacity"
        >
          <img
            src="/logo.webp"
            alt="Satark-AI Logo"
            className="w-10 h-10 object-contain"
            width={40}
            height={40}
            fetchPriority="high"
          />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-400 dark:to-cyan-300 whitespace-nowrap text-lg md:text-2xl">
            {t("brand.name")}
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <SignedIn>
            <nav className="flex gap-2">
              {/* FIX: /features aur /about routes exist nahi karte — hata diye.
                  Agar future mein add karoge toh wapas daal dena. */}
              <Link
                to="/dashboard"
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  location.pathname.startsWith("/dashboard")
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/dashboard/history"
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  location.pathname.startsWith("/dashboard/history")
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                History
              </Link>
            </nav>
            <div className="pl-4 flex items-center gap-4 border-l">
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>
          <SignedOut>
            <Link
              to="/sign-up"
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold rounded-full shadow-lg hover:from-blue-700 hover:to-cyan-600 transition-all text-base"
            >
              Get Started
            </Link>
          </SignedOut>
          <div className="pl-2 flex gap-2 items-center">
            <InstallPWA />
            <LanguageToggle />
            <ModeToggle />
          </div>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 md:hidden">
          <InstallPWA />
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

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="mobile-menu-enter md:hidden border-b bg-background/95 backdrop-blur-xl">
          <div className="p-6 space-y-4">
            <SignedIn>
              <div className="flex flex-col gap-2">
                <Link
                  to="/dashboard"
                  className={`flex items-center justify-between p-4 rounded-xl transition-colors ${
                    location.pathname.startsWith("/dashboard")
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted"
                  }`}
                >
                  <span>Dashboard</span>
                </Link>
                <Link
                  to="/dashboard/history"
                  className={`flex items-center justify-between p-4 rounded-xl transition-colors ${
                    location.pathname.startsWith("/dashboard/history")
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted"
                  }`}
                >
                  <span>History</span>
                </Link>
                <div className="pt-4 mt-2 border-t flex justify-between items-center px-2">
                  <span className="text-sm text-muted-foreground">Profile</span>
                  <UserButton afterSignOutUrl="/" />
                </div>
              </div>
            </SignedIn>
            <SignedOut>
              <div className="flex flex-col gap-3">
                <Link
                  to="/sign-up"
                  className="w-full text-center py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-bold hover:from-blue-700 hover:to-cyan-600 transition-all text-base"
                >
                  Get Started
                </Link>
              </div>
            </SignedOut>
            <div className="flex justify-between items-center pt-4 border-t">
              <span className="text-sm font-medium">Language</span>
              <LanguageToggle />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
