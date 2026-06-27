import { Info, Github, Linkedin, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

export function About() {
  return (
    <div className="min-h-screen bg-background text-foreground pt-20 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <Link
          to="/"
          className="text-sm text-muted-foreground hover:text-primary mb-8 inline-block"
        >
          &larr; Back to Home
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <Info className="text-primary" size={32} />
          <h1 className="text-3xl sm:text-4xl font-extrabold">
            About Satark-AI
          </h1>
        </div>

        <div className="space-y-6 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">
              Our Mission
            </h2>
            <p className="text-lg font-medium text-foreground/80">
              "Defending Truth in the Age of Generative AI"
            </p>
            <p className="mt-3">
              As generative AI becomes increasingly sophisticated,
              distinguishing real from synthetic media is one of the defining
              challenges of our time. Satark-AI was built to empower
              journalists, researchers, and the public with free, accessible,
              and scientifically validated deepfake detection tools.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">
              Technology
            </h2>
            <p>
              Satark-AI combines multiple state-of-the-art machine learning
              approaches:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>
                <strong>Audio Forensics:</strong> Wav2Vec2 transformer (95M
                params) + MFCC spectral analysis for detecting synthetic speech
              </li>
              <li>
                <strong>Image Detection:</strong> Dual Hugging Face models —
                face deepfake detector + AI-image classifier powered by NVIDIA
                NIM (Llama 3.2-90B Vision)
              </li>
              <li>
                <strong>Speaker Verification:</strong> SpeechBrain ECAPA-TDNN
                extracting 192-dim voice embeddings for biometric identity
                matching
              </li>
              <li>
                <strong>Real-time Monitoring:</strong> Live microphone capture
                with 5-second chunk analysis
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">
              Project Status
            </h2>
            <p>
              This project was developed as part of the{" "}
              <strong>MS Elevate AICTE Internship</strong> program (January
              2026). It is built as an open-source, production-grade Turborepo
              monorepo with React frontend, FastAPI Python engine, Hono API
              gateway, PostgreSQL database, and Cloudflare Workers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Creator</h2>
            <div className="bg-card border rounded-xl p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">GK</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    Gautam Kumar
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Full-Stack Developer | Solo-shipped 4 SaaS products | AI
                    integration
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <a
                  href="https://github.com/theunstopabble"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm bg-background border px-4 py-2 rounded-lg hover:text-primary hover:border-primary transition-colors"
                >
                  <Github size={16} /> GitHub
                </a>
                <a
                  href="https://www.linkedin.com/in/gautamkr62"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm bg-background border px-4 py-2 rounded-lg hover:text-primary hover:border-primary transition-colors"
                >
                  <Linkedin size={16} /> LinkedIn
                </a>
                <a
                  href="https://gautam-kr.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm bg-background border px-4 py-2 rounded-lg hover:text-primary hover:border-primary transition-colors"
                >
                  <ExternalLink size={16} /> Portfolio
                </a>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">
              Source Code
            </h2>
            <p>
              Satark-AI is fully open-source. View the code, contribute, or
              report issues on GitHub:
            </p>
            <a
              href="https://github.com/theunstopabble/Satark-AI"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-2 text-primary hover:underline"
            >
              <Github size={16} /> github.com/theunstopabble/Satark-AI
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}
