import { Languages } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full hover:bg-muted transition-colors flex items-center justify-center border border-transparent hover:border-border gap-1"
        title="Change Language"
      >
        <Languages className="h-[1.2rem] w-[1.2rem]" />
        <span className="text-xs font-bold uppercase">{language}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 mt-2 w-32 rounded-xl border bg-popover p-1 shadow-lg z-50"
          >
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => {
                  setLanguage("en");
                  setIsOpen(false);
                }}
                className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                  language === "en"
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted text-popover-foreground"
                }`}
              >
                <span>🇬🇧 English</span>
              </button>
              <button
                onClick={() => {
                  setLanguage("hi");
                  setIsOpen(false);
                }}
                className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                  language === "hi"
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted text-popover-foreground"
                }`}
              >
                <span>🇮🇳 Hindi</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
