import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// FIX: Validate DATABASE_URL exists before creating pool
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    "FATAL: DATABASE_URL environment variable is not set. " +
      "Set it in .env or environment variables.",
  );
  // Don't crash — let the app start but DB queries will fail with clear errors
}

const pool = new Pool({
  connectionString: connectionString || "",
  ssl: { rejectUnauthorized: false },
  // FIX: Connection pool settings for production stability
  max: 20, // Max connections in pool
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Fail fast if DB unreachable
});

// FIX: Handle pool-level errors (prevents unhandled crashes)
pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err);
});

export const db = drizzle(pool, { schema });
