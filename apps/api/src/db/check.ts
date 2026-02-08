import { Client } from "pg";

// Direct IPv6 connection to bypass DNS/IPv4 issues
const connectionString =
  "postgresql://postgres:s5bAyBh9LsG2QiKh@[2406:da18:243:7419:bf02:74a7:aaa3:da77]:5432/postgres?sslmode=require";

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  console.log("🔌 Connecting via IPv6...");
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
