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
import { authMiddleware } from "./middleware/auth";
import { clerkMiddleware } from "@hono/clerk-auth";

// ─── Rate Limiter ────────────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // max requests
const RATE_WINDOW_MS = 60_000; // per 60 seconds

function rateLimiter(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;

  entry.count++;
  return true;
}

// Cleanup stale entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap.entries()) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}, 5 * 60_000);
// ─────────────────────────────────────────────────────────────────────

const app = new Hono();

// Secure CORS configuration
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ||
  "http://localhost:5173,https://satark-deepfake.vercel.app"
)
  .split(",")
  .map((o) => o.trim());

app.use(
  "/*",
  cors({
    origin: (origin) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return origin || "*";
      }
      return "https://satark-deepfake.vercel.app"; // Default fallback
    },
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// Apply Clerk & Auth Middleware to protected routes
app.use("/scan", clerkMiddleware(), authMiddleware);
app.use("/scan-upload", clerkMiddleware(), authMiddleware);
app.use("/scans/*", clerkMiddleware(), authMiddleware);
app.use("/scans", clerkMiddleware(), authMiddleware);
app.use("/scan-image", clerkMiddleware(), authMiddleware);

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

// Helper to save scan results (Removed 'audioMimeType' as it doesn't exist in DB)
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

  if (!rateLimiter(data.userId ?? "anonymous")) {
    return c.json({ error: "Rate limit exceeded." }, 429);
  }

  try {
    const response = await fetch(`${engineUrl}/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Engine Error", response.status, errorText);
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
    const file = body["file"] as File; // Cast to File
    const userId = (body["userId"] as string) ?? "anonymous";

    if (!file || !(file instanceof File)) {
      return c.json({ error: "File is required" }, 400);
    }

    if (!rateLimiter(userId)) {
      return c.json({ error: "Rate limit exceeded." }, 429);
    }

    // 1. Calculate Hash (Deduplication)
    const arrayBuffer = await file.arrayBuffer();
    const hashArray = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", arrayBuffer)),
    );
    const fileHash = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Check Cache
    const existingScan = await db.query.scans.findFirst({
      where: eq(scans.fileHash, fileHash),
    });
    if (existingScan) {
      return c.json({
        ...existingScan,
        isDuplicate: true,
        message: "Loaded from cache",
      });
    }

    // Prepare Data
    const audioData = Buffer.from(arrayBuffer).toString("base64");

    // Save to Local Temp Dir for Analysis
    const safeFileName = `${Date.now()}_${file.name}`;
    const filePath = `/tmp/${safeFileName}`; // Standard temp location
    // NOTE: In production render, ensure /tmp is writable or use os.tmpdir()

    // We need to read the file content again for local storage if we want to save original
    // For now, we rely on the engine to process it

    // Call Local Engine for Analysis
    const engineUrl = process.env.ENGINE_URL || "http://127.0.0.1:8000";
    const formData = new FormData();
    formData.append("file", file, safeFileName); // Append with unique name
    formData.append("userId", userId);

    const response = await fetch(`${engineUrl}/scan-upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return c.json({ error: "Engine Upload Error", details: errorText }, 500);
    }

    const result = await response.json();

    // Save to DB with Hash (Removed audioMimeType)
    const saved = await db
      .insert(scans)
      .values({
        userId: result.userId,
        audioUrl: `uploaded://${safeFileName}`,
        isDeepfake: result.isDeepfake,
        confidenceScore: result.confidenceScore,
        analysisDetails: result.analysisDetails,
        fileHash: fileHash,
        audioData: audioData,
      })
      .returning({ id: scans.id });

    return c.json({ ...result, id: saved[0]?.id });
  } catch (error) {
    console.error("Upload API Error:", error);
    return c.json({ error: "Failed to process upload" }, 500);
  }
});

// ─── Image Deepfake Scan (Cloud Integration) ─────────────────────
app.post("/scan-image", async (c) => {
  try {
    const apiKey = process.env.IMAGE_API_KEY;
    const apiUrl = process.env.IMAGE_API_URL;

    if (!apiKey || !apiUrl) {
      console.error("❌ Missing Config for Image Scan");
      return c.json({ error: "Server Configuration Error" }, 500);
    }

    const body = await c.req.parseBody();
    const file = body["file"] as File;
    const userId = (body["userId"] as string) ?? "anonymous";

    if (!file || !(file instanceof File)) {
      return c.json({ error: "Image file is required" }, 400);
    }

    if (!rateLimiter(userId)) {
      return c.json({ error: "Rate limit exceeded" }, 429);
    }

    const formData = new FormData();
    formData.append("file", file, file.name || "image.png");

    const controller = new AbortController();
    setTimeout(() => controller.abort(), 15000);

    const targetUrl = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;
    const endpointUrl = `${targetUrl}/detect`;

    let data;
    try {
      const extRes = await fetch(endpointUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!extRes.ok) {
        const errorText = await extRes.text();
        console.error(`⛔ Modulate Rejected: ${errorText}`);
        return c.json(
          {
            error: "Analysis Unavailable",
            details: `Status: ${extRes.status}`,
          },
          502,
        );
      }

      data = await extRes.json();
    } catch (err: any) {
      console.error(`💥 Network Crash during scan: ${err.message}`);
      return c.json(
        { error: "Service Busy", details: "Failed to reach provider" },
        500,
      );
    }

    // Safe Mapping
    const isDeepfake = !!data.is_deepfake;
    const confidence = Math.abs(Number(data.score ?? 0));

    const result = {
      user_id: userId,
      audioUrl: `image_scan:${file.name}`,
      isDeepfake,
      confidenceScore: confidence,
      analysisDetails: data.message || "Verification Complete",
      features: data.features || {},
      createdAt: new Date().toISOString(),
    };

    const saved = await saveScanResult(result);
    return c.json({ ...saved, id: saved.id });
  } catch (error) {
    console.error("Critical Scan Error:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

app.get("/audio/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const scan = await db.query.scans.findFirst({
      where: eq(scans.id, Number(id)),
    });
    if (!scan || !scan.audioData) return c.text("Audio not found", 404);

    const audioBuffer = Buffer.from(scan.audioData, "base64");
    return c.body(audioBuffer, 200, { "Content-Type": "audio/wav" });
  } catch (error) {
    console.error("Audio Fetch Error:", error);
    return c.text("Internal Server Error", 500);
  }
});

app.get("/scans", async (c) => {
  const userId = c.req.query("userId");
  if (!userId) return c.json({ error: "UserId is required" }, 400);

  try {
    const history = await db
      .select()
      .from(scans)
      .where(eq(scans.userId, userId))
      .orderBy(desc(scans.createdAt));

    // Clean up history to remove sensitive raw data if needed,
    // or map fields to ensure no missing properties (like audioMimeType)
    const cleanedHistory = history.map((h) => ({
      ...h,
      // Ensure returned object shape is consistent
    }));

    return c.json(cleanedHistory);
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
