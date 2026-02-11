import { Github, Linkedin, Heart } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/30 backdrop-blur-xl mt-20">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand Column */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2 font-bold text-xl">
              <img
                src="/logo.png"
                alt="Satark-AI"
                className="w-8 h-8 object-contain"
              />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500">
                Satark AI
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Defending truth in the age of generative AI. Advanced deepfake
              detection for everyone.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/dashboard" className="hover:text-primary transition">
                  Deepfake Detector
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-primary transition">
                  Live Monitor
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-primary transition">
                  Voice Identity
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="font-semibold mb-4">Connect</h3>
            <div className="flex gap-4">
              <a
                href="https://github.com/theunstopabble"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-background border rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                title="GitHub"
              >
                <Github size={20} />
              </a>
              <a
                href="https://www.linkedin.com/in/gautamkr62/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-background border rounded-full hover:bg-primary/10 hover:text-blue-600 transition-colors"
                title="LinkedIn"
              >
                <Linkedin size={20} />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© {currentYear} Satark AI. All rights reserved.</p>
          <div className="flex items-center gap-1">
            <span>Made with</span>
            <Heart size={14} className="text-red-500 fill-red-500" />
            <span>in India 🇮🇳</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
