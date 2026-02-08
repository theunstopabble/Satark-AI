import { db } from "./index";
import { sql } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config({ path: "apps/api/.env" });

console.log("DB URL:", process.env.DATABASE_URL);
async function main() {
  console.log("⏳ Initializing Database...");

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS scans (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        audio_url TEXT NOT NULL,
        is_deepfake BOOLEAN,
        confidence_score DOUBLE PRECISION,
        analysis_details TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("✅ Database initialized successfully!");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

main();
