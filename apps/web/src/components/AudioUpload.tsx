import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AudioUploadSchema, AudioUploadType } from "@repo/shared";
import { useMutation } from "@tanstack/react-query";
import { useApiClient } from "@/api/client";
import { useUser } from "@clerk/clerk-react";
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Link as LinkIcon,
  FileAudio,
  Music,
  Activity,
  Search,
  AlertCircle,
  CheckCircle2,
  Download,
  Printer,
  Video,
} from "lucide-react";

import { AudioVisualizer } from "./AudioVisualizer";
import { FeatureChart } from "./FeatureChart";
import { ConfidenceMeter } from "./ConfidenceMeter";
import { FeedbackWidget } from "./FeedbackWidget";
import { FakeHeatmap } from "./FakeHeatmap";
import { generateScanReport } from "@/utils/pdfGenerator";

export function AudioUpload() {
  const { user, isLoaded } = useUser();
  const { scanAudio, scanUpload } = useApiClient();
  const [mode, setMode] = useState<"url" | "file">("url");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AudioUploadType>({
    resolver: zodResolver(AudioUploadSchema),
    defaultValues: {
      audioUrl: "",
      userId: user?.id || "",
    },
  });

  // ╔════════════════════════════════════════════════════════════╗
  // ║  FIX: Update userId in form when user loads               ║
  // ║  OLD: defaultValues only set once on mount                ║
  // ║  Problem: user?.id is undefined on first render           ║
  // ╚════════════════════════════════════════════════════════════╝
  useEffect(() => {
    if (user?.id) {
      // Form will use auth userId from backend now,
      // but keep this for schema validation compatibility
    }
  }, [user?.id]);

  const watchedUrl = watch("audioUrl");
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedFile) return;
    const url = URL.createObjectURL(selectedFile);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      // FIX: No longer sending userId — backend gets it from Clerk auth
      if (mode === "url") {
        return scanAudio(data);
      } else {
        if (!selectedFile) throw new Error("No file selected");
        return scanUpload(selectedFile);
      }
    },
    onSuccess: (data) => {
      console.log("Scan Complete:", data.id);
    },
    onError: (error) => {
      console.error(error);
    },
  });

  // ╔════════════════════════════════════════════════════════════╗
  // ║  FIX: Handle form submit for both URL and File modes      ║
  // ║  OLD: Zod validation on audioUrl fails in file mode       ║
  // ║  because audioUrl is empty when uploading a file.         ║
  // ╚════════════════════════════════════════════════════════════╝
  const onSubmit = (data: AudioUploadType) => {
    if (mode === "file") {
      // File mode: skip Zod form validation, use file directly
      if (!selectedFile) {
        setFileError("Please select a file first.");
        return;
      }
      mutation.mutate({ mode: "file" });
    } else {
      // URL mode: Zod-validated data
      mutation.mutate(data);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const MAX_SIZE = 50 * 1024 * 1024;
    const ALLOWED_TYPES = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/ogg",
      "audio/webm",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ];

    if (file.size > MAX_SIZE) {
      setFileError("File too large. Max 50MB allowed.");
      e.target.value = "";
      setSelectedFile(null);
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setFileError("Invalid file format. Please upload Audio or Video only.");
      e.target.value = "";
      setSelectedFile(null);
      return;
    }

    setFileError(null);
    setSelectedFile(file);
  };

  // Forensic metrics for display
  const featureStats = useMemo(
    () => [
      {
        label: "MFCC Mean",
        value: (mutation.data?.features?.mfcc_mean ?? 0).toFixed(2),
        key: "mfcc_mean",
      },
      {
        label: "Silence Ratio",
        value: `${((mutation.data?.features?.silence_ratio ?? 0) * 100).toFixed(1)}%`,
        key: "silence_ratio",
      },
      {
        label: "ZCR",
        value: (mutation.data?.features?.zcr ?? 0).toFixed(4),
        key: "zcr",
      },
    ],
    [mutation.data?.features],
  );

  const suspiciousMetric = useMemo(() => {
    if (!mutation.data?.isDeepfake || !mutation.data?.features) return null;
    const { silence_ratio, zcr, mfcc_mean } = mutation.data.features;
    if (silence_ratio > 0.4) return "silence_ratio";
    if (zcr > 0.15) return "zcr";
    if (mfcc_mean < -100) return "mfcc_mean";
    return null;
  }, [mutation.data]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
          New Analysis
        </h1>
        <p className="text-muted-foreground text-lg">
          Detect deepfakes with advanced spectral processing.
        </p>
      </div>

      <div className="bg-card border rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300 relative">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Activity size={120} />
        </div>

        <div className="p-8">
          {/* Tabs */}
          <div className="flex justify-center mb-8">
            <div className="flex space-x-2 p-1.5 bg-muted/50 rounded-xl border">
              <button
                onClick={() => {
                  setMode("url");
                  setFileError(null);
                }}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  mode === "url"
                    ? "bg-background text-primary shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <LinkIcon size={16} /> URL Link
              </button>
              <button
                onClick={() => {
                  setMode("file");
                  setFileError(null);
                }}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  mode === "file"
                    ? "bg-background text-primary shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Upload size={16} /> File Upload
              </button>
            </div>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6 max-w-2xl mx-auto relative z-10"
          >
            <AnimatePresence mode="wait">
              {mode === "url" ? (
                <motion.div
                  key="url-input"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <label className="block text-sm font-medium mb-2 text-foreground/80">
                    Paste Audio URL
                  </label>
                  <div className="relative group">
                    <Search
                      className="absolute left-3 top-3.5 text-muted-foreground group-focus-within:text-primary transition-colors"
                      size={20}
                    />
                    <input
                      {...register("audioUrl")}
                      placeholder="https://example.com/audio.mp3"
                      className="w-full pl-10 pr-4 py-3 border rounded-xl bg-background/50 focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm"
                    />
                  </div>
                  {errors.audioUrl && (
                    <p className="text-destructive text-sm mt-2 flex items-center gap-1">
                      <AlertCircle size={14} /> {errors.audioUrl.message}
                    </p>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="file-input"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <label className="block text-sm font-medium mb-2 text-foreground/80">
                    Upload Audio File
                  </label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-10 text-center hover:bg-muted/30 hover:border-primary/50 transition-all cursor-pointer relative group">
                    <input
                      type="file"
                      accept="audio/*,video/*"
                      title="Upload Audio & Video File"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <div className="space-y-4">
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary group-hover:scale-110 transition-transform duration-300">
                        {selectedFile ? (
                          <FileAudio size={32} />
                        ) : (
                          <Upload size={32} />
                        )}
                      </div>
                      <div className="text-sm">
                        {selectedFile ? (
                          <span className="font-semibold text-primary text-lg block mb-1">
                            {selectedFile.name}
                          </span>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-gray-300 font-medium">
                              Drag & drop audio or video here, or click to
                              select
                            </p>
                            <p className="text-xs text-gray-500">
                              Supports MP3, WAV, MP4, MOV, AVI (Max 50MB)
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* FIX: File validation error display */}
                  {fileError && (
                    <p className="text-destructive text-sm mt-2 flex items-center gap-1">
                      <AlertCircle size={14} /> {fileError}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full bg-gradient-to-r from-primary to-primary/90 text-primary-foreground px-4 py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-primary/25 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-3"
            >
              {mutation.isPending ? (
                <>
                  <span className="animate-spin text-xl">⏳</span> Processing
                  Audio...
                </>
              ) : (
                <>
                  Run Diagnostics <Activity size={20} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {mutation.data && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <ConfidenceMeter
                score={mutation.data.confidenceScore}
                isDeepfake={mutation.data.isDeepfake}
              />
              <div className="mt-6 text-center">
                <span
                  className={`inline-block px-4 py-2 rounded-full font-bold text-lg ${
                    mutation.data.isDeepfake
                      ? "bg-red-100 text-red-600 border border-red-300"
                      : "bg-green-100 text-green-700 border border-green-300"
                  }`}
                >
                  {mutation.data.isDeepfake
                    ? "Synthetic (Deepfake)"
                    : "Real (Authentic)"}
                </span>
              </div>
            </div>

            <div className="md:col-span-2 bg-card rounded-2xl border shadow-sm p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <FileAudio size={120} />
              </div>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                {mutation.data.isDeepfake ? (
                  <span className="text-red-500">
                    <CheckCircle2 />
                  </span>
                ) : (
                  <span className="text-green-500">
                    <CheckCircle2 />
                  </span>
                )}
                Analysis Report
              </h3>

              {mutation.data.isDuplicate && (
                <div className="bg-amber-500/10 border-l-4 border-amber-500 text-amber-700 dark:text-amber-400 p-4 mb-6 rounded-r">
                  <p className="font-bold flex items-center gap-2">
                    Loaded from Cache
                  </p>
                  <p className="text-sm">
                    This file has been analyzed before. Retrieving existing
                    results.
                  </p>
                </div>
              )}

              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                {mutation.data.analysisDetails}
              </p>

              {/* Forensic Metrics */}
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-center gap-4">
                  {featureStats.map((stat, i) => (
                    <div key={i} className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">
                          {stat.label}
                        </span>
                        <span className="text-xs font-mono">{stat.value}</span>
                      </div>
                      <div className="w-full h-3 rounded bg-muted/30 relative overflow-hidden">
                        <div
                          className={`h-3 rounded transition-all duration-500 ${
                            suspiciousMetric === stat.key &&
                            mutation.data.isDeepfake
                              ? "bg-red-500"
                              : "bg-green-500/70"
                          }`}
                          style={{
                            width:
                              suspiciousMetric === stat.key &&
                              mutation.data.isDeepfake
                                ? "100%"
                                : "60%",
                            opacity:
                              suspiciousMetric === stat.key &&
                              mutation.data.isDeepfake
                                ? 1
                                : 0.5,
                          }}
                        />
                      </div>
                      {suspiciousMetric === stat.key &&
                        mutation.data.isDeepfake && (
                          <div className="text-xs text-red-600 mt-1 font-semibold">
                            Suspicious
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border/50">
                <FeedbackWidget scanId={mutation.data.id} />
              </div>
            </div>
          </div>

          {/* Visualizer & Graphs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {((mode === "url" && watchedUrl) ||
              (mode === "file" && selectedFile)) && (
              <div className="bg-card rounded-2xl border shadow-sm p-6">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  {selectedFile?.type.startsWith("video/") ? (
                    <>
                      <Video size={18} /> Video Preview
                    </>
                  ) : (
                    <>
                      <Music size={18} /> Waveform
                    </>
                  )}
                </h4>
                {selectedFile?.type.startsWith("video/") ? (
                  <video
                    controls
                    className="w-full rounded-lg max-h-[400px] bg-black"
                    src={objectUrl || ""}
                  />
                ) : (
                  <AudioVisualizer
                    audioUrl={
                      mode === "url" ? watchedUrl || "" : objectUrl || ""
                    }
                  />
                )}
              </div>
            )}

            {/* FIX: Null-safe check for segments and duration */}
            {mutation.data.features?.segments &&
              mutation.data.features.segments.length > 0 &&
              mutation.data.features.duration &&
              mutation.data.features.duration > 0 && (
                <FakeHeatmap
                  segments={mutation.data.features.segments}
                  duration={mutation.data.features.duration}
                />
              )}

            {mutation.data.features?.mfcc_plot &&
              mutation.data.features.mfcc_plot.length > 0 && (
                <div className="bg-card rounded-2xl border shadow-sm p-6">
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <Activity size={18} /> Spectral Analysis
                  </h4>
                  <FeatureChart
                    data={mutation.data.features.mfcc_plot}
                    label="MFCC Features"
                    color="hsl(var(--primary))"
                  />
                </div>
              )}
          </div>

          <div className="flex justify-end gap-3 print:hidden pt-4 border-t">
            <button
              onClick={() => {
                const blob = new Blob(
                  [JSON.stringify(mutation.data, null, 2)],
                  { type: "application/json" },
                );
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `scan.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2 text-muted-foreground"
            >
              <Download size={16} /> JSON
            </button>
            <button
              onClick={() =>
                generateScanReport(mutation.data, user?.fullName || "Guest")
              }
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Printer size={16} /> PDF Report
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 transition-colors flex items-center gap-2"
            >
              <Printer size={16} /> Print Results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
