import { Link, useLocation } from "react-router-dom";
import { Shield } from "lucide-react";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";

export function Navbar() {
  const location = useLocation();
  const isDashboard = location.pathname.includes("/dashboard");

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 font-bold text-xl hover:opacity-80 transition-opacity"
        >
          <Shield className="text-primary" size={24} />
          <span>Satark AI</span>
          <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full border border-primary/20">
            Beta
          </span>
        </Link>

        {/* Navigation / Actions */}
        <div className="flex items-center gap-6">
          <SignedOut>
            <div className="flex items-center gap-4">
              <Link
                to="/sign-in"
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/sign-up"
                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 transition-all shadow-sm shadow-primary/20"
              >
                Get Started
              </Link>
            </div>
          </SignedOut>

          <SignedIn>
            <div className="flex items-center gap-4">
              {!isDashboard && (
                <Link
                  to="/dashboard"
                  className="text-sm font-medium hover:text-primary transition-colors"
                >
                  Dashboard
                </Link>
              )}
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>
        </div>
      </div>
    </nav>
  );
}
