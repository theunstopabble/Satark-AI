import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { zValidator } from "@hono/zod-validator";
import { AudioUploadSchema } from "@repo/shared";
import { db } from "./db";
import { scans } from "./db/schema";

const app = new Hono();

app.use("/*", cors());

app.get("/", (c) => {
  return c.text("Satark-AI API is Running! 🚀");
});

app.get("/health-db", async (c) => {
  try {
    const result = await db.execute(sql`SELECT 1`);
    return c.json({ status: "ok", db: "connected" });
  } catch (error) {
    console.error("Health Check DB Error:", error);
    return c.json(
      { status: "error", db: "disconnected", error: String(error) },
      500,
    );
  }
});

app.post("/scan", zValidator("json", AudioUploadSchema), async (c) => {
  const data = c.req.valid("json");

  const engineUrl = process.env.ENGINE_URL || "http://127.0.0.1:8000";

  try {
    // Forward to Python AI Engine
    const response = await fetch(`${engineUrl}/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI Engine Error (${response.status}):`, errorText);
      return c.json({ error: "AI Engine Error", details: errorText }, 500);
    }

    const result = await response.json();

    // Save to Database
    try {
      await db.insert(scans).values({
        userId: result.userId, // Assuming AI engine returns userId
        audioUrl: result.audioUrl, // Assuming AI engine returns audioUrl
        isDeepfake: result.isDeepfake,
        confidenceScore: result.confidenceScore,
        analysisDetails: result.analysisDetails,
      });
    } catch (dbError) {
      console.error("❌ Failed to save scan to DB:", dbError);
    }

    return c.json(result);
  } catch (error) {
    console.error("API Error:", error);
    return c.json({ error: "Failed to connect to AI Engine" }, 503);
  }
});

app.post("/scan-upload", async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body["file"];
    const userId = body["userId"];

    if (!file || !(file instanceof File)) {
      return c.json({ error: "File is required" }, 400);
    }

    const formData = new FormData();
    formData.append("file", file, file.name);
    formData.append("userId", userId as string);

    const engineUrl = process.env.ENGINE_URL || "http://127.0.0.1:8000";

    // Forward to Python Engine
    const response = await fetch(`${engineUrl}/scan-upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return c.json(
        { error: "AI Engine Upload Error", details: errorText },
        500,
      );
    }

    const result = await response.json();

    // Save to Database
    try {
      await db.insert(scans).values({
        userId: result.userId,
        audioUrl: result.audioUrl,
        isDeepfake: result.isDeepfake,
        confidenceScore: result.confidenceScore,
        analysisDetails: result.analysisDetails,
      });
    } catch (dbError) {
      console.error("❌ Failed to save upload scan to DB:", dbError);
    }

    return c.json(result);
  } catch (error) {
    console.error("Upload API Error:", error);
    return c.json({ error: "Failed to process upload" }, 500);
  }
});

import { desc, eq, sql } from "drizzle-orm";

app.get("/scans", async (c) => {
  const userId = c.req.query("userId");

  if (!userId) {
    return c.json({ error: "UserId is required" }, 400);
  }

  try {
    const history = await db
      .select()
      .from(scans)
      .where(eq(scans.userId, userId))
      .orderBy(desc(scans.createdAt));

    return c.json(history);
  } catch (error) {
    console.error("History Fetch Error:", error);
    return c.json({ error: "Failed to fetch history" }, 500);
  }
});

import { serve } from "@hono/node-server";

const port = 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
