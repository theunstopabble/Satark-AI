import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AudioUploadSchema, AudioUploadType } from "@repo/shared";
import { useMutation } from "@tanstack/react-query";
import { useApiClient } from "@/api/client";
import { useUser } from "@clerk/clerk-react";
import { useState } from "react";
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
  const { user } = useUser();
  const { scanAudio, scanUpload } = useApiClient();
  const [mode, setMode] = useState<"url" | "file">("url");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Form Setup
  const {
    register,
    handleSubmit,
    watch,
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
                onClick={() => setMode("url")}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  mode === "url"
                    ? "bg-background text-primary shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <LinkIcon size={16} /> URL Link
              </button>
              <button
                onClick={() => setMode("file")}
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
                      accept="audio/*"
                      title="Upload Audio File"
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
            </div>

            <div className="md:col-span-2 bg-card rounded-2xl border shadow-sm p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <FileAudio size={120} />
              </div>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <CheckCircle2 className="text-green-500" /> Analysis Report
              </h3>
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                {mutation.data.analysisDetails}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  {
                    label: "Silence Ratio",
                    value: `${((mutation.data.features?.silence_ratio || 0) * 100).toFixed(1)}%`,
                  },
                  {
                    label: "Duration",
                    value: `${(mutation.data.features?.duration || 0).toFixed(2)}s`,
                  },
                  {
                    label: "Zero Crossing",
                    value: (mutation.data.features?.zcr || 0).toFixed(4),
                  },
                  {
                    label: "Rolloff",
                    value: `${(mutation.data.features?.rolloff || 0).toFixed(0)} Hz`,
                  },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className="p-3 bg-muted/40 rounded-lg border border-border/50"
                  >
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      {stat.label}
                    </div>
                    <div className="text-lg font-mono font-semibold text-foreground">
                      {stat.value}
                    </div>
                  </div>
                ))}
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
                    src={URL.createObjectURL(selectedFile)}
                  />
                ) : (
                  <AudioVisualizer
                    audioUrl={
                      mode === "url"
                        ? watchedUrl || ""
                        : selectedFile
                          ? URL.createObjectURL(selectedFile)
                          : ""
                    }
                  />
                )}
              </div>
            )}

            {/* XAI Heatmap Integration */}
            {mutation.data?.features?.segments &&
              mutation.data.features.duration && (
                <FakeHeatmap
                  segments={mutation.data.features.segments}
                  duration={mutation.data.features.duration}
                />
              )}

            {mutation.data.features?.mfcc_plot && (
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
