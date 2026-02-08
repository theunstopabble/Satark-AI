import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/api/client";
import { useUser } from "@clerk/clerk-react";
import { ScanResultType } from "@repo/shared";

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
    <div className="border rounded-lg shadow-sm bg-card text-card-foreground">
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold">Past Scans</h2>
      </div>
      <div className="p-4">
        {scans?.length === 0 ? (
          <p className="text-muted-foreground">No scans found.</p>
        ) : (
          <div className="space-y-4">
            {scans?.map((scan: ScanResultType) => (
              <div
                key={scan.id}
                className="border p-3 rounded flex justify-between items-center"
              >
                <div>
                  <p
                    className="font-medium truncate max-w-[200px]"
                    title={scan.audioUrl}
                  >
                    {scan.audioUrl.startsWith("uploaded://")
                      ? "📁 File Upload"
                      : "🔗 URL Scan"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(scan.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`px-2 py-1 rounded text-sm font-bold ${scan.isDeepfake ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
                  >
                    {scan.isDeepfake ? "FAKE 🚨" : "REAL ✅"}
                  </span>
                  <p className="text-xs mt-1">
                    {(scan.confidenceScore * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
