import { Link } from "react-router-dom";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { ModeToggle } from "./mode-toggle";
import { LanguageToggle } from "./language-toggle";
import { useLanguage } from "../context/LanguageContext";

/**
 * Lightweight navbar for the public landing page.
 * NO Clerk imports - keeps Clerk auth SDK off the critical path.
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

export function LandingNavbar() {
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur-xl shadow-sm">
            <style>{mobileMenuStyles}</style>
            <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2 font-bold hover:opacity-80 transition-opacity">
                    <img
                        src="/logo.webp"
                        alt="Satark-AI Logo"
                        className="w-10 h-10 object-contain"
                        width={40}
                        height={40}
                        fetchPriority="high"
                    />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-400 dark:to-cyan-300 whitespace-nowrap text-lg md:text-2xl font-bold">
                        {t("brand.name")}
                    </span>
                </Link>

                {/* Desktop */}
                <div className="hidden md:flex items-center gap-4">
                    <Link to="/sign-in" className="text-sm font-medium hover:text-primary transition-colors">
                        {t("nav.signin")}
                    </Link>
                    <Link
                        to="/sign-up"
                        className="px-5 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-full hover:bg-primary/90 transition-all active:scale-95"
                    >
                        {t("nav.getstarted")}
                    </Link>
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
                        <Link to="/sign-in" className="w-full text-center py-3 rounded-xl hover:bg-muted transition-colors font-medium">
                            {t("nav.signin")}
                        </Link>
                        <Link to="/sign-up" className="w-full text-center py-3 bg-primary text-primary-foreground rounded-xl font-bold">
                            {t("nav.getstarted")}
                        </Link>
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
