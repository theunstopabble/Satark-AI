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
import crypto from "node:crypto";
import { randomUUID } from "crypto";

// ─── Rate Limiter ────────────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

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

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap.entries()) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}, 5 * 60_000);
// ─────────────────────────────────────────────────────────────────────

const app = new Hono();

// CORS Setup
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
      return "https://satark-deepfake.vercel.app";
    },
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// Apply Clerk Middleware
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
    await db.execute(sql`SELECT 1`);
    return c.json({ status: "ok", db: "connected" });
  } catch (error) {
    console.error("Health Check DB Error:", error);
    return c.json({ status: "error", db: "disconnected" }, 500);
  }
});

// Helper to save scan results (Returns the Numeric ID from Database)
async function saveScanResult(result: any): Promise<number | null> {
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

    return inserted?.id ?? null;
  } catch (dbError) {
    console.error("❌ Failed to save scan to DB:", dbError);
    return null;
  }
}

// --- 1. URL Scan Route ---
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
      return c.json({ error: "Engine Error", details: errorText }, 500);
    }

    const result = await response.json();
    const scanId = await saveScanResult(result);

    return c.json({ ...result, id: scanId });
  } catch (error) {
    console.error("API Error:", error);
    return c.json({ error: "Failed to connect to AI Engine" }, 503);
  }
});

// --- 2. Upload Scan Route ---
app.post("/scan-upload", async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body["file"] as File;
    const userId = (body["userId"] as string) ?? "anonymous";

    if (!file || !(file instanceof File)) {
      return c.json({ error: "File is required" }, 400);
    }

    if (!rateLimiter(userId)) {
      return c.json({ error: "Rate limit exceeded." }, 429);
    }

    // Calculate Hash
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

    // Base64 Data
    const audioData = Buffer.from(arrayBuffer).toString("base64");

    // Call Local Engine
    const engineUrl = process.env.ENGINE_URL || "http://127.0.0.1:8000";
    const formData = new FormData();
    formData.append("file", file, `upload_${Date.now()}`);
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

    // Save with Hash & ID
    const savedId = await saveScanResult({
      ...result,
      userId: result.userId,
      audioUrl: `uploaded://${file.name}`,
      fileHash: fileHash,
    });

    return c.json({ ...result, id: savedId });
  } catch (error) {
    console.error("Upload API Error:", error);
    return c.json({ error: "Failed to process upload" }, 500);
  }
});

// --- 3. Image Deepfake Scan Route (Cloud) ---

app.post("/scan-image", async (c) => {
  try {
    const apiUrl = process.env.IMAGE_API_URL;
    const apiKey = process.env.IMAGE_API_KEY; // Optional, Worker overrides it

    if (!apiUrl) {
      return c.json(
        { error: "Server Configuration Error: IMAGE_API_URL missing" },
        500,
      );
    }

    const body = await c.req.parseBody();
    const file = body["file"];
    const userId = (body["userId"] as string) ?? "anonymous";

    if (!file || !(file instanceof File)) {
      return c.json({ error: "Image file is required" }, 400);
    }

    if (!rateLimiter(String(userId))) {
      return c.json({ error: "Rate limit exceeded" }, 429);
    }

    const formData = new FormData();
    formData.append("file", file, file.name || "image.png");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // ⬆️ 30s for AI processing

    try {
      console.log(`📡 Forwarding image scan to: ${apiUrl}`);
      const extRes = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "X-API-Key": apiKey || "proxy-handled", // 🔥 Modulate X-API-Key expect karta hai
          // 🔥 Content-Type yahan se hata do. FormData automatically correct boundary set karega.
        },
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!extRes.ok) {
        const errorText = await extRes.text();
        console.error(
          `⛔ External API Rejected: ${extRes.status} - ${errorText}`,
        );
        return c.json(
          {
            error: "Analysis Unavailable",
            details: `Status: ${extRes.status}`,
          },
          502,
        );
      }

      const data = await extRes.json();
      console.log(
        "✅ Modulate/Proxy Response:",
        JSON.stringify(data).slice(0, 200),
      );

      // 🔥 Resilient Field Mapping (Handles is_deepfake, is_fake, fake, etc.)
      const isDeepfake = !!(
        data.is_deepfake ||
        data.is_fake ||
        data.fake ||
        data.prediction === "fake"
      );
      const confidence = Math.abs(
        Number(data.score ?? data.confidence ?? data.probability ?? 0),
      );

      const mappedResult = {
        userId: String(userId),
        audioUrl: `image_scan:${file.name}`,
        isDeepfake,
        confidenceScore: Math.min(confidence, 1.0), // Ensure 0-1 range
        analysisDetails:
          data.message || data.reason || "Image verification complete",
        features: {},
        createdAt: new Date().toISOString(),
      };

      const savedId = await saveScanResult(mappedResult);

      return c.json({ ...mappedResult, id: savedId ?? Date.now() });
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err?.name === "AbortError") {
        return c.json(
          {
            error: "Scan Timeout",
            details: "AI provider did not respond in 30s.",
          },
          504,
        );
      }
      console.error(`💥 Network Crash: ${err?.message || err}`);
      return c.json(
        { error: "Service Busy", details: String(err?.message || err) },
        500,
      );
    }
  } catch (error: any) {
    console.error("Critical Scan Error:", error?.message || error);
    return c.json(
      {
        error: "Internal Server Error",
        details: String(error?.message || error),
      },
      500,
    );
  }
});

// --- 4. Helpers ---

app.get("/audio/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const scan = await db.query.scans.findFirst({
      where: eq(scans.id, Number(id)),
    });
    if (!scan || !scan.audioData) return c.text("Not found", 404);

    const audioBuffer = Buffer.from(scan.audioData, "base64");
    return c.body(audioBuffer, 200, { "Content-Type": "audio/wav" });
  } catch (error) {
    return c.text("Error", 500);
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
    return c.json(history);
  } catch (error) {
    return c.json({ error: "History Error" }, 500);
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
    return c.json({ error: "Feedback Error" }, 500);
  }
});

const port = Number(process.env.PORT) || 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
