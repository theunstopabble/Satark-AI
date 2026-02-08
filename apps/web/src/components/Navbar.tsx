import { Link, useLocation } from "react-router-dom";
import { Shield, Menu, X, ChevronRight } from "lucide-react";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Navbar() {
  const location = useLocation();
  const isDashboard = location.pathname.includes("/dashboard");
  const [isOpen, setIsOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 font-bold text-2xl hover:opacity-80 transition-opacity"
        >
          <div className="bg-primary/10 p-2 rounded-lg">
            <Shield className="text-primary" size={26} />
          </div>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80">
            Satark AI
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <SignedOut>
            <div className="flex items-center gap-6">
              <Link
                to="/sign-in"
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/sign-up"
                className="px-5 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-full hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95"
              >
                Get Started
              </Link>
            </div>
          </SignedOut>

          <SignedIn>
            <div className="flex items-center gap-6">
              <nav className="flex gap-1 p-1 bg-muted/50 rounded-full border">
                <Link
                  to="/dashboard"
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    isDashboard && !location.pathname.includes("/history")
                      ? "bg-background text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  New Scan
                </Link>
                <Link
                  to="/dashboard/history"
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    location.pathname.includes("/history")
                      ? "bg-background text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  History
                </Link>
              </nav>
              <div className="pl-4 border-l">
                <UserButton afterSignOutUrl="/" />
              </div>
            </div>
          </SignedIn>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 text-foreground hover:bg-muted rounded-lg transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b bg-background/95 backdrop-blur-xl"
          >
            <div className="p-6 space-y-4">
              <SignedIn>
                <div className="flex flex-col gap-2">
                  <Link
                    to="/dashboard"
                    className={`flex items-center justify-between p-4 rounded-xl transition-colors ${
                      isDashboard && !location.pathname.includes("/history")
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted"
                    }`}
                  >
                    <span>New Scan</span> <ChevronRight size={16} />
                  </Link>
                  <Link
                    to="/dashboard/history"
                    className={`flex items-center justify-between p-4 rounded-xl transition-colors ${
                      location.pathname.includes("/history")
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted"
                    }`}
                  >
                    <span>History</span> <ChevronRight size={16} />
                  </Link>
                  <div className="pt-4 mt-2 border-t flex justify-between items-center px-2">
                    <span className="text-sm text-muted-foreground">
                      Profile
                    </span>
                    <UserButton afterSignOutUrl="/" />
                  </div>
                </div>
              </SignedIn>
              <SignedOut>
                <div className="flex flex-col gap-3">
                  <Link
                    to="/sign-in"
                    className="w-full text-center py-3 rounded-xl hover:bg-muted transition-colors font-medium"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/sign-up"
                    className="w-full text-center py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:shadow-lg transition-all"
                  >
                    Get Started
                  </Link>
                </div>
              </SignedOut>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
