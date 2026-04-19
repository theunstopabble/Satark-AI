import { Link } from "react-router-dom";
import {
  Shield,
  Activity,
  FileAudio,
  MonitorSmartphone,
  Gamepad2,
  FileText,
  Users,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export function Landing() {
  const { t } = useLanguage();

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes floatUp {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        @keyframes floatDown {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(20px); }
        }
        .float-up { animation: floatUp 5s ease-in-out infinite; }
        .float-down { animation: floatDown 7s ease-in-out 1s infinite; }
        .feature-card { transition: border-color 0.2s; }
        .feature-card:hover { border-color: hsl(var(--primary) / 0.5); }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 text-foreground flex flex-col pt-16">
        {/* Hero Section */}
        <main className="flex-1 flex flex-col items-center justify-center text-center p-6 relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />

          <div className="max-w-4xl mx-auto space-y-8">
            <div className="inline-block px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-medium mb-4">
              {t("landing.hero.badge")}
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/70">
              {t("landing.hero.headline1")} <br />
              <span className="text-primary">
                {t("landing.hero.headline2")}
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {t("landing.hero.subheading")}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
              <Link
                to="/dashboard"
                className="px-8 py-4 bg-primary text-primary-foreground rounded-lg text-lg font-bold hover:scale-105 transition-transform shadow-xl shadow-primary/20 flex items-center gap-2"
              >
                {t("landing.hero.cta1")} <Activity size={20} />
              </Link>
              <a
                href="#features"
                className="px-8 py-4 bg-card border hover:bg-muted text-foreground rounded-lg text-lg font-medium transition-colors"
              >
                {t("landing.hero.cta2")}
              </a>
            </div>
          </div>

          {/* Floating Elements */}
          <div className="float-up absolute top-1/4 right-[10%] opacity-20 hidden lg:block pointer-events-none">
            <FileAudio size={120} className="text-primary" />
          </div>
          <div className="float-down absolute bottom-1/4 left-[10%] opacity-20 hidden lg:block pointer-events-none">
            <Shield size={100} className="text-blue-500" />
          </div>
        </main>

        {/* Features Grid */}
        <section id="features" className="py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
              {t("landing.features.title")}
            </h2>
            <div className="grid md:grid-cols-4 gap-8">
              {[
                {
                  icon: <FileAudio className="text-blue-500" size={32} />,
                  title: t("landing.features.audio"),
                  desc: t("landing.features.audio.desc"),
                },
                {
                  icon: (
                    <MonitorSmartphone className="text-green-500" size={32} />
                  ),
                  title: t("landing.features.live"),
                  desc: t("landing.features.live.desc"),
                },
                {
                  icon: <Gamepad2 className="text-purple-500" size={32} />,
                  title: t("landing.features.game"),
                  desc: t("landing.features.game.desc"),
                },
                {
                  icon: <FileText className="text-orange-500" size={32} />,
                  title: t("landing.features.pdf"),
                  desc: t("landing.features.pdf.desc"),
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="feature-card p-8 bg-card rounded-xl border shadow-sm"
                >
                  <div className="mb-4 p-3 bg-background rounded-lg w-fit border">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust Signals */}
        <section className="py-12 bg-background border-t border-b">
          <div className="max-w-4xl mx-auto flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-lg font-semibold text-muted-foreground">
              <Users className="text-primary" size={24} />
              {t("landing.trust.title")}
            </div>
            <div className="flex gap-8 mt-2">
              <div className="text-center">
                <div className="text-3xl font-extrabold text-primary">10M+</div>
                <div className="text-sm text-muted-foreground">
                  {t("landing.trust.files")}
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-extrabold text-primary">
                  99.9%
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("landing.trust.uptime")}
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-extrabold text-primary">50+</div>
                <div className="text-sm text-muted-foreground">
                  {t("landing.trust.orgs")}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
