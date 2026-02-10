import { useState } from "react";
import { useUser } from "@clerk/clerk-react";
import {
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { useApiClient } from "@/api/client";

export function SpeakerIdentity() {
  const { user } = useUser();
  const [tab, setTab] = useState<"verify" | "enroll">("verify");
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const { enrollSpeaker, verifySpeaker } = useApiClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const handleEnroll = async () => {
    if (!file || !name) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      await enrollSpeaker(file, name, user?.id || "guest");

      setResult({
        success: true,
        message: "Voice Identity Registered Successfully!",
      });
      setFile(null);
      setName("");
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const data = await verifySpeaker(file, user?.id || "guest");
      setResult(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
          Voice Identity Shield
        </h1>
        <p className="text-muted-foreground text-lg">
          Biometric Speaker Verification System
        </p>
      </div>

      <div className="bg-card border rounded-2xl shadow-xl overflow-hidden p-6 relative">
        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-muted/50 p-1 rounded-xl flex space-x-2">
            <button
              onClick={() => setTab("verify")}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${tab === "verify" ? "bg-background shadow text-blue-400" : "text-muted-foreground hover:text-foreground"}`}
            >
              <ShieldCheck className="inline w-4 h-4 mr-2" /> Verify Identity
            </button>
            <button
              onClick={() => setTab("enroll")}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${tab === "enroll" ? "bg-background shadow text-indigo-400" : "text-muted-foreground hover:text-foreground"}`}
            >
              <UserPlus className="inline w-4 h-4 mr-2" /> Enroll New Speaker
            </button>
          </div>
        </div>

        <div className="max-w-xl mx-auto space-y-6">
          {/* Enrollment Form */}
          {tab === "enroll" && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Speaker Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Narendra Modi"
                  className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Reference Audio (Clear Voice)
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept="audio/*"
                  title="Reference Audio Upload"
                  className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>
              <button
                onClick={handleEnroll}
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="animate-spin mx-auto" />
                ) : (
                  "Enroll Speaker"
                )}
              </button>
            </div>
          )}

          {/* Verification Form */}
          {tab === "verify" && (
            <div className="space-y-4 animate-in slide-in-from-left-4 duration-300">
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm text-blue-300">
                Upload an audio file to check if it matches any enrolled
                speaker's voice print.
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Test Audio
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept="audio/*"
                  title="Test Audio Upload"
                  className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              <button
                onClick={handleVerify}
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="animate-spin mx-auto" />
                ) : (
                  "Verify Identity"
                )}
              </button>
            </div>
          )}

          {/* Result Display */}
          {result && (
            <div
              className={`p-6 rounded-xl border ${result.success || result.isMatch ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"} animate-in zoom-in-95 duration-300`}
            >
              <div className="flex items-center gap-3 mb-2">
                {result.success || result.isMatch ? (
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                )}
                <h3 className="font-bold text-lg">
                  {result.message ||
                    (result.isMatch ? "Identity Verified" : "Identity Risk")}
                </h3>
              </div>
              <p className="text-muted-foreground">
                {result.details ||
                  (result.isMatch
                    ? `Confirmed Match: ${result.name}`
                    : "Speaker does not match any enrolled identity.")}
              </p>
              {result.score && (
                <div className="mt-2 text-sm font-mono opacity-70">
                  Confidence Score: {(result.score * 100).toFixed(2)}%
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
              Error: {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
