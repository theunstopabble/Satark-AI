import {
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  doublePrecision,
} from "drizzle-orm/pg-core";

export const scans = pgTable("scans", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  audioUrl: text("audio_url").notNull(),
  isDeepfake: boolean("is_deepfake"),
  confidenceScore: doublePrecision("confidence_score"),
  analysisDetails: text("analysis_details"),
  createdAt: timestamp("created_at").defaultNow(),
  feedback: text("feedback"),
});
