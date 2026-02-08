import { z } from "zod";

export const AudioUploadSchema = z.object({
  audioUrl: z.string().url(),
  userId: z.string().min(1),
  fileName: z.string().optional(),
});

export type AudioUploadType = z.infer<typeof AudioUploadSchema>;

export const ScanResultSchema = z.object({
  id: z.string(),
  userId: z.string(),
  audioUrl: z.string(),
  isDeepfake: z.boolean(),
  confidenceScore: z.number().min(0).max(100),
  analysisDetails: z.string().optional(), // For XAI explanation
  features: z
    .object({
      zcr: z.number(),
      rolloff: z.number(),
      mfcc_mean: z.number(),
      silence_ratio: z.number(),
      duration: z.number(),
      mfcc_plot: z.array(z.number()),
    })
    .optional(),
  createdAt: z.string().or(z.date()), // API returns string, Date object in DB
});

export type ScanResultType = z.infer<typeof ScanResultSchema>;
