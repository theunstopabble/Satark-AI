import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function main() {
  console.log("Migrating speakers table...");

  // Create speakers table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "speakers" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "user_id" text NOT NULL,
      "name" text NOT NULL,
      "embedding" json NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
    );
  `);

  console.log("Migration complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
