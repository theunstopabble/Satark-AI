import dotenv from "dotenv";

// Load Env BEFORE importing DB
dotenv.config({ path: "apps/api/.env" });

async function main() {
  console.log("🔍 Checking Database for Scans...");
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is missing!");
    process.exit(1);
  }

  // Dynamic import to avoid hoisting issues
  const { db } = await import("./index");
  const { scans } = await import("./schema");
  const { desc } = await import("drizzle-orm");

  try {
    const results = await db
      .select()
      .from(scans)
      .orderBy(desc(scans.createdAt))
      .limit(1);

    if (results.length > 0) {
      console.log("✅ Found latest scan:", results[0]);
    } else {
      console.log("⚠️ No scans found in DB.");
    }
    process.exit(0);
  } catch (error) {
    console.error("❌ DB Check Failed:", error);
    process.exit(1);
  }
}

main();
