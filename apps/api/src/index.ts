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

// ─── File Validation ─────────────────────────────────────────────────
const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/ogg",
  "audio/webm",
  "audio/mp4",
  "audio/flac",
  "audio/aac",
  "video/mp4",
  "video/webm",
];
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

function validateFile(file: File, allowImages = false): string | null {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File too large. Max size is 50MB. Your file: ${(file.size / 1024 / 1024).toFixed(1)}MB`;
  }
  const allowed = allowImages
    ? [...ALLOWED_AUDIO_TYPES, ...ALLOWED_IMAGE_TYPES]
    : ALLOWED_AUDIO_TYPES;
  if (!allowed.includes(file.type)) {
    return `Invalid file type: ${file.type}. Allowed: audio and video files only.`;
  }
  return null; // null = valid
}
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
app.use("/scan", clerkMiddleware());
app.use("/scan-upload", clerkMiddleware());
app.use("/scans/*", clerkMiddleware());
app.use("/scans", clerkMiddleware());
app.use("/scan", authMiddleware);
app.use("/scan-upload", authMiddleware);
app.use("/scans/*", authMiddleware);
app.use("/scans", authMiddleware);
app.use("/scan-image", clerkMiddleware());
app.use("/scan-image", authMiddleware);
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

  if (!rateLimiter(data.userId ?? "anonymous")) {
    return c.json(
      { error: "Rate limit exceeded. Max 10 scans per minute." },
      429,
    );
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
    const file = body["file"];
    const userId = body["userId"];

    if (!file || !(file instanceof File)) {
      return c.json({ error: "File is required" }, 400);
    }

    const rateLimitUserId = (userId as string) ?? "anonymous";
    if (!rateLimiter(rateLimitUserId)) {
      return c.json(
        { error: "Rate limit exceeded. Max 10 scans per minute." },
        429,
      );
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

// ─── Image Deepfake Scan ─────────────────────────────────────────────

app.post("/scan-image", async (c) => {
  // 1. Retrieve credentials
  const apiKey = process.env.IMAGE_API_KEY;
  const apiUrl = process.env.IMAGE_API_URL;
  if (!apiKey || !apiUrl) {
    console.error("Missing IMAGE_API_KEY or IMAGE_API_URL");
    return c.json({ error: "Server Configuration Error" }, 500);
  }

  // 2. Parse multipart form
  const body = await c.req.parseBody();
  const file = body["file"];
  const userId = (body["userId"] as string) ?? "anonymous";
  if (!file || !(file instanceof File)) {
    return c.json({ error: "Image file is required" }, 400);
  }

  // 3. Optional: Rate limit and file size checks
  if (!rateLimiter(userId)) {
    return c.json(
      { error: "Rate limit exceeded. Max 10 scans per minute." },
      429,
    );
  }
  if (file.size > 50 * 1024 * 1024) {
    return c.json({ error: "File too large. Max size is 50MB." }, 400);
  }

  // 4. Prepare FormData
  const formData = new FormData();
  formData.append("file", file, file.name || "uploaded_image.png");

  // 5. Setup AbortController for timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  let extResponse;
  try {
    const extRes = await fetch(`${apiUrl}/detect`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!extRes.ok) {
      const errorText = await extRes.text();
      return c.json(
        {
          error: "External Scan Failed",
          details: errorText || "No error details received",
        },
        502,
      );
    }
    extResponse = await extRes.json();
  } catch (err: any) {
    clearTimeout(timeout);
    if (err && err.name === "AbortError") {
      return c.json(
        {
          error: "Server Busy",
          details: "Modulate AI took too long to respond",
        },
        504,
      );
    }
    return c.json(
      { error: "External Scan Failed", details: err?.message || String(err) },
      502,
    );
  }

  // 6. Map response
  const mappedResult = {
    isDeepfake: extResponse.is_deepfake,
    confidenceScore: extResponse.score,
    analysisDetails: "AI Verification Complete via Modulate",
    features: extResponse.features || {},
    userId,
    audioUrl: "image_upload",
    createdAt: new Date(),
  };

  // 7. Save and return
  const scanId = await saveScanResult(mappedResult);
  return c.json({ ...mappedResult, id: scanId });
});

app.get("/audio/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const scan = await db.query.scans.findFirst({
      where: eq(scans.id, Number(id)),
    });

    if (!scan || !scan.audioData) {
      return c.text("Audio not found", 404);
    }

    const audioBuffer = Buffer.from(scan.audioData, "base64");

    // Simple way to serve binary data in Hono
    return c.body(audioBuffer, 200, {
      "Content-Type": "audio/wav", // Assuming WAV for simplicity, or generic audio
      "Content-Length": audioBuffer.length.toString(),
    });
  } catch (error) {
    console.error("Audio Fetch Error:", error);
    return c.text("Internal Server Error", 500);
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
