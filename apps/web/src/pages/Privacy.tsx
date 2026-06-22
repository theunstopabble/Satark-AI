import { Shield } from "lucide-react";
import { Link } from "react-router-dom";

export function Privacy() {
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
          <Shield className="text-primary" size={32} />
          <h1 className="text-3xl sm:text-4xl font-extrabold">Privacy Policy</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">
          Last updated: June 2026
        </p>

        <div className="space-y-6 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">1. Information We Collect</h2>
            <p>
              Satark-AI collects minimal data necessary to provide deepfake detection services:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Uploaded Media:</strong> Audio files and images you submit for analysis are processed temporarily and not stored permanently unless you choose to save scan history.</li>
              <li><strong>Account Information:</strong> If you sign up via Clerk, we store your email address and authentication credentials (managed securely by Clerk).</li>
              <li><strong>Usage Data:</strong> Anonymous analytics via Vercel Analytics to improve the platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">2. How We Use Your Data</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Process audio and image files for deepfake detection</li>
              <li>Enroll and verify speaker voice prints (stored as anonymized embeddings, not raw audio)</li>
              <li>Improve detection models and platform performance</li>
              <li>Provide you with scan history (if you have an account)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">3. Data Storage & Security</h2>
            <p>
              Voice embeddings are stored as anonymized 192-dimensional vectors in PostgreSQL, not as raw audio files.
              Uploaded media for one-off scans is deleted immediately after processing.
              We use industry-standard encryption (HTTPS) for all data transmission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">4. Third-Party Services</h2>
            <p>We use the following third-party services:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Clerk</strong> — Authentication and user management</li>
              <li><strong>Vercel</strong> — Hosting and analytics</li>
              <li><strong>Hugging Face</strong> — AI model inference (image detection)</li>
              <li><strong>Cloudflare Workers</strong> — Image proxy processing</li>
              <li><strong>PostgreSQL (Supabase/Neon/Railway)</strong> — Database</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">5. Your Rights</h2>
            <p>
              You have the right to request deletion of your account and associated data at any time.
              Contact us at the email below for data deletion requests.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">6. Contact</h2>
            <p>
              For privacy concerns, reach out via GitHub:{' '}
              <a href="https://github.com/theunstopabble" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                github.com/theunstopabble
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
