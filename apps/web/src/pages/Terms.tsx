import { Scale } from "lucide-react";
import { Link } from "react-router-dom";

export function Terms() {
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
          <Scale className="text-primary" size={32} />
          <h1 className="text-3xl sm:text-4xl font-extrabold">Terms of Service</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">
          Last updated: June 2026
        </p>

        <div className="space-y-6 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p>
              By using Satark-AI, you agree to these Terms of Service. If you do not agree, please do not use the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">2. Service Description</h2>
            <p>
              Satark-AI provides deepfake detection and speaker verification services using machine learning models.
              Results are provided for informational purposes and should not be used as sole evidence in legal proceedings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">3. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Use the service for any illegal purpose</li>
              <li>Upload malware or malicious files</li>
              <li>Attempt to reverse-engineer the detection models</li>
              <li>Abuse the API or automate excessive requests</li>
              <li>Misrepresent analysis results</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">4. Limitation of Liability</h2>
            <p>
              Satark-AI is provided "as is" without warranty of any kind. The detection results are probabilistic
              and may not be 100% accurate. The creators shall not be liable for any damages arising from the use
              of this platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">5. Intellectual Property</h2>
            <p>
              The Satark-AI platform, including its code, models, and branding, is open-source under the
              project license. User-uploaded content remains the property of the user.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">6. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Users will be notified of material changes
              via the platform or email.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
