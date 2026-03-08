import { Link } from "react-router-dom";
import { Shield, Activity, FileAudio } from "lucide-react";

// CSS animation styles - zero JS runtime cost vs framer-motion
const fadeUp = {
  animation: "fadeUp 0.8s ease forwards",
};
const fadeUpDelay = (delay: number) => ({
  animation: `fadeUp 0.8s ease ${delay}s both`,
});

export function Landing() {
  return (
    <>
      {/* Inject keyframes once via style tag */}
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

      <div className="min-h-screen bg-background text-foreground flex flex-col pt-16">
        {/* Hero Section */}
        <main className="flex-1 flex flex-col items-center justify-center text-center p-6 relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />

          <div className="max-w-4xl mx-auto space-y-8" style={fadeUp}>
            <div className="inline-block px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-medium mb-4">
              🚀 Advanced Deepfake Detection System
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/70">
              Defending Truth in the <br />
              <span className="text-primary">Age of Generative AI</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed" style={fadeUpDelay(0.2)}>
              Detect AI-generated audio with scientifically validated precision.
              Empowering journalists, researchers, and the public to verify
              authenticity instantly.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8" style={fadeUpDelay(0.4)}>
              <Link
                to="/dashboard"
                className="px-8 py-4 bg-primary text-primary-foreground rounded-lg text-lg font-bold hover:scale-105 transition-transform shadow-xl shadow-primary/20 flex items-center gap-2"
              >
                Analyze Audio Now <Activity size={20} />
              </Link>
              <a
                href="#features"
                className="px-8 py-4 bg-card border hover:bg-muted text-foreground rounded-lg text-lg font-medium transition-colors"
              >
                How it Works
              </a>
            </div>
          </div>

          {/* Floating Elements - CSS only, no framer-motion */}
          <div className="float-up absolute top-1/4 right-[10%] opacity-20 hidden lg:block pointer-events-none">
            <FileAudio size={120} className="text-primary" />
          </div>
          <div className="float-down absolute bottom-1/4 left-[10%] opacity-20 hidden lg:block pointer-events-none">
            <Shield size={100} className="text-blue-500" />
          </div>
        </main>

        {/* Feature Section */}
        <section id="features" className="py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
              How Satark Works
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: <Activity className="text-blue-500" size={32} />,
                  title: "Spectral Analysis",
                  desc: "Analyzes MFCC and Zero Crossing Rates to detect compression artifacts invisible to the human ear.",
                  delay: 0,
                },
                {
                  icon: <FileAudio className="text-purple-500" size={32} />,
                  title: "Multi-Format Support",
                  desc: "Upload MP3, WAV, or paste URLs. We handle the processing pipeline securely and privately.",
                  delay: 0.15,
                },
                {
                  icon: <Shield className="text-green-500" size={32} />,
                  title: "Instant Verification",
                  desc: "Get real-time confidence scores and detailed analysis reports to validate content source.",
                  delay: 0.3,
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="feature-card p-8 bg-card rounded-xl border shadow-sm"
                  style={fadeUpDelay(feature.delay)}
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
      </div>
    </>
  );
}
