import dotenv from "dotenv";
import { Client } from "pg";

dotenv.config({ path: "apps/api/.env" });

const connectionString = process.env.DATABASE_URL;
console.log(`URL Length: ${connectionString?.length}`);

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  console.log("🔌 Connecting to Pooler (IPv4)...");
  try {
    await client.connect();
    console.log("✅ Connected successfully!");
    const res = await client.query("SELECT NOW()");
    console.log("🕒 Server Time:", res.rows[0]);
    await client.end();
  } catch (err) {
    console.error("❌ Connection failed:", err);
  }
}

main();
