import {
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  doublePrecision,
  uuid,
  json,
  index,
} from "drizzle-orm/pg-core";

export const scans = pgTable(
  "scans",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    audioUrl: text("audio_url").notNull(),
    isDeepfake: boolean("is_deepfake"),
    confidenceScore: doublePrecision("confidence_score"),
    fileHash: text("file_hash"),
    audioData: text("audio_data"), // Base64 encoded audio
    analysisDetails: text("analysis_details"),
    createdAt: timestamp("created_at").defaultNow(),
    feedback: text("feedback"),
  },
  (table) => {
    return {
      userIdIdx: index("scans_user_id_idx").on(table.userId),
      createdAtIdx: index("scans_created_at_idx").on(table.createdAt),
      fileHashIdx: index("scans_file_hash_idx").on(table.fileHash),
    };
  },
);

export const speakers = pgTable(
  "speakers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    embedding: json("embedding").notNull(), // Vector array
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => {
    return {
      userIdIdx: index("speakers_user_id_idx").on(table.userId),
    };
  },
);
