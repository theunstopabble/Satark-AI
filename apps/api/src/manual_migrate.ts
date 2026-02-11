import "dotenv/config";
import { db } from "./db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Running manual migration...");
  try {
    // Add fileHash column
    await db.execute(
      sql`ALTER TABLE scans ADD COLUMN IF NOT EXISTS file_hash text;`,
    );
    console.log("Added file_hash column.");

    // Add audioData column
    await db.execute(
      sql`ALTER TABLE scans ADD COLUMN IF NOT EXISTS audio_data text;`,
    );
    console.log("Added audio_data column.");

    // Add Indexes (Optional but good)
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS scans_file_hash_idx ON scans (file_hash);`,
    );
    console.log("Added file_hash index.");

    console.log("Migration successful!");
  } catch (error) {
    console.error("Migration failed:", error);
  }
  process.exit(0);
}

main();
