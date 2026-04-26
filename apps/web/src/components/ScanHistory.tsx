import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/api/client";
import { useUser, useAuth } from "@clerk/clerk-react";
import { ScanResultType } from "@repo/shared";
import { AnalyticsStats } from "./AnalyticsStats";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

export function ScanHistory() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { getHistory } = useApiClient();

  const {
    data: scans,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["scans", user?.id],
    // ╔════════════════════════════════════════════════════════════╗
    // ║  FIX: getHistory now takes 0 arguments                   ║
    // ║  OLD: getHistory(user?.id || "")                          ║
    // ║  Problem: client API updated, userId now from auth token  ║
    // ╚════════════════════════════════════════════════════════════╝
    queryFn: () => getHistory(),
    enabled: !!user?.id,
  });

  if (isLoading) return <div className="p-4">Loading history...</div>;
  if (error)
    return <div className="p-4 text-red-500">Failed to load history</div>;

  return (
    <div className="space-y-8">
      {scans && scans.length > 0 && <AnalyticsStats scans={scans} />}

      <div className="border rounded-xl shadow-sm bg-card text-card-foreground overflow-hidden">
        <div className="p-6 border-b bg-muted/30">
          <h2 className="text-xl font-bold flex items-center gap-2">
            Recent Activity
          </h2>
        </div>
        <div className="p-0">
          {scans?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No scans found. Start your first scan!
            </div>
          ) : (
            <div className="divide-y">
              {scans?.map((scan: ScanResultType) => (
                <div
                  key={scan.id}
                  className="p-4 flex flex-col md:flex-row flex-wrap justify-between items-start md:items-center hover:bg-muted/50 transition-colors gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg mt-1">
                      {scan.audioUrl.startsWith("uploaded://") ? (
                        <span className="text-xl">📁</span>
                      ) : scan.audioUrl.startsWith("image_scan") ? (
                        <span className="text-xl">🖼️</span>
                      ) : (
                        <span className="text-xl">🔗</span>
                      )}
                    </div>
                    <div>
                      <p
                        className="font-medium text-sm md:text-base truncate max-w-[200px] md:max-w-[400px]"
                        title={scan.audioUrl}
                      >
                        {scan.audioUrl
                          .replace("uploaded://", "")
                          .replace("image_scan:", "")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {dateFormatter.format(new Date(scan.createdAt))}
                      </p>
                      {/* ╔══════════════════════════════════════════════╗ */}
                      {/* ║  FIX: Audio player with auth token           ║ */}
                      {/* ║  OLD: src without auth → 401 Unauthorized    ║ */}
                      {/* ║  FIX: Fetch with auth header via blob URL    ║ */}
                      {/* ╚══════════════════════════════════════════════╝ */}
                      {scan.audioUrl.startsWith("uploaded://") && (
                        <AudioPlayer scanId={scan.id} getToken={getToken} />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-wrap self-end md:self-auto">
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground block mb-0.5">
                        Confidence
                      </span>
                      <span className="font-mono font-bold">
                        {(scan.confidenceScore * 100).toFixed(2)}%
                      </span>
                    </div>
                    <span
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                        scan.isDeepfake
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-green-50 text-green-700 border-green-200"
                      }`}
                    >
                      {scan.audioUrl?.includes("image_scan")
                        ? scan.isDeepfake
                          ? "Fake Image"
                          : "Real Image"
                        : scan.isDeepfake
                          ? "Fake Audio"
                          : "Real Audio"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║  NEW: AudioPlayer component with authenticated fetch           ║
// ║  Problem: <audio src="..."> doesn't send auth headers.         ║
// ║  Backend now requires auth on /audio/:id → audio won't load.   ║
// ║  FIX: Fetch audio as blob with auth, create object URL.        ║
// ╚══════════════════════════════════════════════════════════════════╝
import { useState, useEffect } from "react";

function AudioPlayer({
  scanId,
  getToken,
}: {
  scanId: number;
  getToken: () => Promise<string | null>;
}) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    async function loadAudio() {
      try {
        const token = await getToken();
        const API_URL = (
          import.meta.env.VITE_API_URL || "http://localhost:3000"
        ).replace(/\/+$/, "");

        const res = await fetch(`${API_URL}/audio/${scanId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          if (!cancelled) setFailed(true);
          return;
        }

        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) {
          setAudioUrl(objectUrl);
        }
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAudio();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [scanId, getToken]);

  if (loading) {
    return (
      <div className="mt-2 text-xs text-muted-foreground">Loading audio...</div>
    );
  }

  if (failed || !audioUrl) {
    return null; // Silently skip if audio unavailable
  }

  return (
    <div className="mt-2">
      <audio controls src={audioUrl} className="h-8 w-48" />
    </div>
  );
}
