import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Sparkles, Activity, FileAudio } from "lucide-react";

export function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pt-16">
      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto space-y-8"
        >
          <div className="inline-block px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-medium mb-4">
            🚀 Advanced Deepfake Detection System
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/70">
            Defending Truth in the <br />
            <span className="text-primary">Age of Generative AI</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Detect AI-generated audio with scientifically validated precision.
            Empowering journalists, researchers, and the public to verify
            authenticity instantly.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
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
        </motion.div>

        {/* Floating Elements Animation */}
        <motion.div
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 right-[10%] opacity-20 hidden lg:block"
        >
          <FileAudio size={120} className="text-primary" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 20, 0] }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute bottom-1/4 left-[10%] opacity-20 hidden lg:block"
        >
          <Sparkles size={100} className="text-blue-500" />
        </motion.div>
      </main>

      {/* Feature Section */}
      <section id="features" className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Activity className="text-blue-500" size={32} />,
                title: "Spectral Analysis",
                desc: "Analyzes MFCC and Zero Crossing Rates to detect compression artifacts invisible to the human ear.",
              },
              {
                icon: <FileAudio className="text-purple-500" size={32} />,
                title: "Multi-Format Support",
                desc: "Upload MP3, WAV, or paste URLs. We handle the processing pipeline securely and privately.",
              },
              {
                icon: <Shield className="text-green-500" size={32} />,
                title: "Instant Verification",
                desc: "Get real-time confidence scores and detailed analysis reports to validate content source.",
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="p-8 bg-card rounded-xl border hover:border-primary/50 transition-colors shadow-sm"
              >
                <div className="mb-4 p-3 bg-background rounded-lg w-fit border">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t text-center text-muted-foreground text-sm">
        <p>&copy; 2026 Satark AI. Built for Social Good.</p>
      </footer>
    </div>
  );
}
