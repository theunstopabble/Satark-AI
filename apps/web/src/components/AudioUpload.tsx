import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AudioUploadSchema, AudioUploadType } from "@repo/shared";
import { useMutation } from "@tanstack/react-query";
import { useApiClient } from "@/api/client";
import { useUser } from "@clerk/clerk-react";

import { useState } from "react";

import { AudioVisualizer } from "./AudioVisualizer";
import { FeatureChart } from "./FeatureChart";
import { ConfidenceMeter } from "./ConfidenceMeter";

export function AudioUpload() {
  const { user } = useUser();
  const { scanAudio, scanUpload } = useApiClient();
  const [mode, setMode] = useState<"url" | "file">("url");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Form Setup
  const {
    register,
    handleSubmit,
    watch, // Add watch to get the URL for visualizer
    formState: { errors },
  } = useForm<AudioUploadType>({
    resolver: zodResolver(AudioUploadSchema),
    defaultValues: {
      userId: user?.id || "",
    },
  });

  const watchedUrl = watch("audioUrl");

  // Mutation Setup
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (mode === "url") {
        return scanAudio({ ...data, userId: user?.id || "guest" });
      } else {
        if (!selectedFile) throw new Error("No file selected");
        return scanUpload(selectedFile, user?.id || "guest");
      }
    },
    onSuccess: () => {
      // Scan complete - results shown in UI
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const onSubmit = (data: AudioUploadType) => {
    mutation.mutate(data);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-6 border rounded-xl shadow-sm bg-card text-card-foreground">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <span role="img" aria-label="wave">
            🎙️
          </span>{" "}
          New Audio Scan
        </h2>

        <div className="flex space-x-2 p-1 bg-muted rounded-lg w-fit mb-6">
          <button
            onClick={() => setMode("url")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === "url" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            URL Link
          </button>
          <button
            onClick={() => setMode("file")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === "file" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            File Upload
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {mode === "url" ? (
            <div>
              <label className="block text-sm font-medium mb-2">
                Paste Audio URL
              </label>
              <input
                {...register("audioUrl")}
                placeholder="https://example.com/audio.mp3"
                className="w-full p-3 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
              {errors.audioUrl && (
                <p className="text-destructive text-sm mt-1">
                  {errors.audioUrl.message}
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-2">
                Upload Audio File (MP3/WAV)
              </label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer relative">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  aria-label="Upload audio file"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <p className="text-muted-foreground">
                  {selectedFile
                    ? `Selected: ${selectedFile.name}`
                    : "Drag & drop or click to upload"}
                </p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full bg-primary text-primary-foreground px-4 py-3 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-all flex justify-center items-center gap-2"
          >
            {mutation.isPending ? (
              <>
                <span className="animate-spin">⏳</span> Analyzing Audio...
              </>
            ) : (
              <>🚀 Run Analysis</>
            )}
          </button>
        </form>
      </div>

      {mutation.data && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Confidence Meter */}
            <ConfidenceMeter
              score={mutation.data.confidenceScore}
              isDeepfake={mutation.data.isDeepfake}
            />

            {/* Analysis Details */}
            <div className="md:col-span-2 p-6 bg-card rounded-xl border shadow-sm">
              <h3 className="text-lg font-bold mb-2">Analysis Report</h3>
              <p className="text-muted-foreground mb-4">
                {mutation.data.analysisDetails}
              </p>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-muted rounded-lg">
                  <span className="block text-muted-foreground">
                    Zero Crossing Rate
                  </span>
                  <span className="font-mono">
                    {mutation.data.features?.zcr.toFixed(4) || "N/A"}
                  </span>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <span className="block text-muted-foreground">
                    Spectral Rolloff
                  </span>
                  <span className="font-mono">
                    {mutation.data.features?.rolloff.toFixed(0) || "N/A"} Hz
                  </span>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <span className="block text-muted-foreground">
                    Silence Ratio
                  </span>
                  <span className="font-mono">
                    {(mutation.data.features?.silence_ratio || 0 * 100).toFixed(
                      1,
                    )}
                    %
                  </span>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <span className="block text-muted-foreground">Duration</span>
                  <span className="font-mono">
                    {(mutation.data.features?.duration || 0).toFixed(2)}s
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Audio Visualizer */}
          {(mode === "url" && watchedUrl) ||
          (mode === "file" && selectedFile) ? (
            <AudioVisualizer
              audioUrl={
                mode === "url"
                  ? watchedUrl
                  : selectedFile
                    ? URL.createObjectURL(selectedFile)
                    : ""
              }
            />
          ) : null}

          {/* Feature Graphs */}
          {mutation.data.features?.mfcc_plot && (
            <div className="grid grid-cols-1 gap-6">
              <FeatureChart
                data={mutation.data.features.mfcc_plot}
                label="MFCC Features (Texture Analysis)"
                color="#8884d8"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-4 print:hidden">
            <button
              onClick={() => {
                const blob = new Blob(
                  [JSON.stringify(mutation.data, null, 2)],
                  { type: "application/json" },
                );
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `scan_report_${mutation.data.id}.json`;
                a.click();
              }}
              className="px-4 py-2 border rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
            >
              <span>💾 Download JSON</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors flex items-center gap-2"
            >
              <span>🖨️ Print Report</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
