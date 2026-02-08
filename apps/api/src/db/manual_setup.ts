import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: "apps/api/.env" });

const connectionString = process.env.DATABASE_URL;

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  console.log("⏳ Initializing Database via Client...");

  try {
    await client.connect();
    console.log("✅ Connected!");

    await client.query(`
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
    console.log("✅ Table 'scans' created successfully!");
    await client.end();
  } catch (error) {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  }
}

main();
