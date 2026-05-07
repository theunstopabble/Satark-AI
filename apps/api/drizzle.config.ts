import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { resolve } from "node:path";

// Load .env from apps/api/ regardless of cwd
config({ path: resolve("apps/api/.env") });

export default defineConfig({
  schema: "apps/api/src/db/schema.ts",
  out: "apps/api/drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
});
