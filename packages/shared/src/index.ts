import { z } from "zod";

// ╔══════════════════════════════════════════════════════════════════╗
// ║  FIX: AudioUploadSchema — userId removed from client payload   ║
// ║  OLD: userId: z.string().min(1) — REQUIRED field               ║
// ║  Problem: Client no longer sends userId (backend gets it from  ║
// ║  Clerk auth). Zod validation was failing on every /scan call.  ║
// ║  FIX: userId is now optional in schema. Backend uses auth.     ║
// ╚══════════════════════════════════════════════════════════════════╝
export const AudioUploadSchema = z
  .object({
    userId: z.string().optional(), // FIX: Optional — backend gets from auth
    audioUrl: z.string().optional(),
    fileName: z.string().optional(),
    file: z.any().optional(),
  })
  .refine(
    (data) => {
      // At least one of audioUrl or file must be provided
      return !!data.audioUrl || !!data.file;
    },
    {
      message: "Either audioUrl or file must be provided",
      path: ["audioUrl"],
    },
  );

export type AudioUploadType = z.infer<typeof AudioUploadSchema>;

export const ScanResultSchema = z.object({
  id: z.union([z.string(), z.number()]), // FIX: Accept both string and number (DB serial)
  userId: z.string(),
  audioUrl: z.string(),
  isDeepfake: z.boolean(),
  confidenceScore: z.number().min(0).max(1),
  analysisDetails: z.string().optional(),
  features: z
    .object({
      zcr: z.number().optional(),
      rolloff: z.number().optional(),
      mfcc_mean: z.number().optional(),
      silence_ratio: z.number().optional(),
      duration: z.number().optional(),
      mfcc_plot: z.array(z.number()).optional(),
      segments: z
        .array(
          z.object({
            start: z.number(),
            end: z.number(),
            score: z.number(),
          }),
        )
        .optional(),
    })
    .optional(),
  createdAt: z.string().or(z.date()),
  isDuplicate: z.boolean().optional(),
  fileHash: z.string().optional(),
  audioData: z.string().optional(),
});

export type ScanResultType = z.infer<typeof ScanResultSchema>;
