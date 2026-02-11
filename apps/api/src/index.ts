import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { zValidator } from "@hono/zod-validator";
import { AudioUploadSchema } from "@repo/shared";
import { db } from "./db";
import { scans } from "./db/schema";
import speakerRouter from "./routes/speaker";
import { serve } from "@hono/node-server";
import { desc, eq, sql } from "drizzle-orm";

const app = new Hono();
app.use("/*", cors());

app.route("/api/speaker", speakerRouter);

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

// Helper to save scan results
async function saveScanResult(result: any) {
  try {
    const [inserted] = await db
      .insert(scans)
      .values({
        userId: result.userId,
        audioUrl: result.audioUrl,
        isDeepfake: result.isDeepfake,
        confidenceScore: result.confidenceScore,
        analysisDetails: result.analysisDetails,
      })
      .returning({ id: scans.id });

    return inserted?.id;
  } catch (dbError) {
    console.error("❌ Failed to save scan to DB:", dbError);
    return null;
  }
}

app.post("/scan", zValidator("json", AudioUploadSchema), async (c) => {
  const data = c.req.valid("json");
  const engineUrl = process.env.ENGINE_URL || "http://127.0.0.1:8000";

  try {
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
    const scanId = await saveScanResult(result);

    return c.json({ ...result, id: scanId });
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

    // 1. Calculate File Hash (Deduplication)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const fileHash = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // 2. Check DB for existing hash
    const existingScan = await db.query.scans.findFirst({
      where: eq(scans.fileHash, fileHash),
    });

    if (existingScan) {
      console.log(`♻️ Duplicate Scan Found: ${existingScan.id}`);
      return c.json({
        ...existingScan,
        isDuplicate: true,
        message: "Loaded from cache",
      });
    }

    // 3. Prepare Audio Data (Base64) for Storage
    const audioData = buffer.toString("base64");

    const formData = new FormData();
    formData.append("file", file, file.name);
    formData.append("userId", userId as string);

    const engineUrl = process.env.ENGINE_URL || "http://127.0.0.1:8000";

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

    // 4. Save to DB with Hash and Audio Data
    const saveResult = await db
      .insert(scans)
      .values({
        userId: result.userId,
        audioUrl: result.audioUrl,
        isDeepfake: result.isDeepfake,
        confidenceScore: result.confidenceScore,
        analysisDetails: result.analysisDetails,
        fileHash: fileHash,
        audioData: audioData,
      })
      .returning({ id: scans.id });

    const scanId = saveResult[0]?.id;

    return c.json({ ...result, id: scanId });
  } catch (error) {
    console.error("Upload API Error:", error);
    return c.json({ error: "Failed to process upload" }, 500);
  }
});

// New Endpoint: Serve Audio from DB
app.get("/audio/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const scan = await db.query.scans.findFirst({
      where: eq(scans.id, Number(id)),
    });

    if (!scan || !scan.audioData) {
      return c.status(404);
    }

    const audioBuffer = Buffer.from(scan.audioData, "base64");

    // Simple way to serve binary data in Hono
    return c.body(audioBuffer, 200, {
      "Content-Type": "audio/wav", // Assuming WAV for simplicity, or generic audio
      "Content-Length": audioBuffer.length.toString(),
    });
  } catch (error) {
    console.error("Audio Fetch Error:", error);
    return c.status(500);
  }
});

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

app.post("/scans/:id/feedback", async (c) => {
  const id = c.req.param("id");
  const { feedback } = await c.req.json();

  try {
    await db
      .update(scans)
      .set({ feedback })
      .where(eq(scans.id, Number(id)));
    return c.json({ success: true });
  } catch (error) {
    console.error("Feedback Error:", error);
    return c.json({ error: "Failed to submit feedback" }, 500);
  }
});

const port = Number(process.env.PORT) || 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
