import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/api/client";
import { useUser } from "@clerk/clerk-react";
import { ScanResultType } from "@repo/shared";
import { AnalyticsStats } from "./AnalyticsStats";

export function ScanHistory() {
  const { user } = useUser();
  const { getHistory } = useApiClient();

  const {
    data: scans,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["scans", user?.id],
    queryFn: () => getHistory(user?.id || ""),
    enabled: !!user?.id,
  });

  if (isLoading) return <div className="p-4">Loading history...</div>;
  if (error)
    return <div className="p-4 text-red-500">Failed to load history</div>;

  return (
    <div className="space-y-8">
      {/* Analytics Section */}
      {scans && scans.length > 0 && <AnalyticsStats scans={scans} />}

      {/* History List */}
      <div className="border rounded-xl shadow-sm bg-card text-card-foreground overflow-hidden">
        <div className="p-6 border-b bg-muted/30">
          <h2 className="text-xl font-bold flex items-center gap-2">
            📜 Recent Activity
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
                  className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-muted/50 transition-colors gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg mt-1">
                      {scan.audioUrl.startsWith("uploaded://") ? (
                        <span className="text-xl">📁</span>
                      ) : (
                        <span className="text-xl">🔗</span>
                      )}
                    </div>
                    <div>
                      <p
                        className="font-medium text-sm md:text-base truncate max-w-[200px] md:max-w-[400px]"
                        title={scan.audioUrl}
                      >
                        {scan.audioUrl.replace("uploaded://", "")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(scan.createdAt).toLocaleString()}
                      </p>
                      {/* Audio Player for Uploads */}
                      {scan.audioUrl.startsWith("uploaded://") && (
                        <div className="mt-2">
                          <audio
                            controls
                            src={`${
                              import.meta.env.VITE_API_URL ||
                              "http://localhost:3000"
                            }/audio/${scan.id}`}
                            className="h-8 w-48"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end md:self-auto">
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground block mb-0.5">
                        Confidence
                      </span>
                      <span className="font-mono font-bold">
                        {(scan.confidenceScore * 100).toFixed(1)}%
                      </span>
                    </div>
                    <span
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                        scan.isDeepfake
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-green-50 text-green-700 border-green-200"
                      }`}
                    >
                      {scan.isDeepfake ? "FAKE 🚨" : "REAL ✅"}
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
