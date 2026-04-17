import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useApiClient } from "../api/client";
import { motion } from "framer-motion";
import { Image, Upload, ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";
import { ConfidenceMeter } from "./ConfidenceMeter";

export function ImageUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const { scanImage } = useApiClient();

  const mutation = useMutation({
    mutationFn: (file: File) => scanImage(file),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (selectedFile) mutation.mutate(selectedFile);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
          Image Analysis
        </h1>
        <p className="text-muted-foreground text-lg">
          Detect AI-generated or deepfake images with our vision model.
        </p>
      </div>

      {/* Upload Card */}
      <div className="bg-card border rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
        <div className="p-8 space-y-6">
          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-muted rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => document.getElementById("image-input")?.click()}
          >
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="max-h-64 mx-auto rounded-lg object-contain"
              />
            ) : (
              <div className="space-y-3">
                <Image className="w-12 h-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">
                  Drop image here or{" "}
                  <span className="text-primary font-medium">browse</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports: JPG, PNG, WEBP, GIF, BMP (max 50MB)
                </p>
              </div>
            )}
            <input
              id="image-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/bmp"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* File Info */}
          {selectedFile && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Image className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm truncate">{selectedFile.name}</span>
              <span className="text-xs text-muted-foreground ml-auto shrink-0">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!selectedFile || mutation.isPending}
            className="w-full py-3 px-6 bg-primary text-primary-foreground rounded-xl font-semibold
              disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors
              flex items-center justify-center gap-2"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Analyzing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" /> Analyze Image
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {mutation.data && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 rounded-xl border ${
            mutation.data.isDeepfake
              ? "bg-red-500/10 border-red-500/30"
              : "bg-green-500/10 border-green-500/30"
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            {mutation.data.isDeepfake ? (
              <ShieldAlert className="w-8 h-8 text-red-400" />
            ) : (
              <ShieldCheck className="w-8 h-8 text-green-400" />
            )}
            <div>
              <h3 className="font-bold text-xl">
                {mutation.data.isDeepfake
                  ? "⚠️ Deepfake Detected"
                  : "✅ Image Appears Real"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {mutation.data.analysisDetails}
              </p>
            </div>
          </div>
          <ConfidenceMeter
            score={mutation.data.confidenceScore}
            isDeepfake={mutation.data.isDeepfake}
          />
        </motion.div>
      )}

      {/* Error */}
      {mutation.error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
          Error: {(mutation.error as Error).message}
        </div>
      )}
    </div>
  );
}
