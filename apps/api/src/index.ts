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
import { authMiddleware, requireAuth } from "./middleware/auth";
import { clerkMiddleware } from "@hono/clerk-auth";
import crypto from "node:crypto";

// ─── Rate Limiter ────────────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMITS = {
  default: 10,
  scanUpload: 60,
};
const RATE_WINDOW_MS = 60_000;

function rateLimiter(userId: string, limit: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= limit) return false;

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
      // ╔════════════════════════════════════════════════════════════╗
      // ║  FIX: Return undefined to REJECT unknown origins          ║
      // ║  OLD: return "https://satark-deepfake.vercel.app"         ║
      // ║  Problem: Silently allowing unknown origins via fallback   ║
      // ╚════════════════════════════════════════════════════════════╝
      return undefined;
    },
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// ╔══════════════════════════════════════════════════════════════════╗
// ║  FIX: Auth middleware on ALL protected routes                   ║
// ║  OLD: Speaker routes had NO auth at all                         ║
// ║  /api/speaker/* now requires Clerk authentication               ║
// ╚══════════════════════════════════════════════════════════════════╝
app.use("/scan", clerkMiddleware(), authMiddleware);
app.use("/scan-upload", clerkMiddleware(), authMiddleware);
app.use("/scans/*", clerkMiddleware(), requireAuth);
app.use("/scans", clerkMiddleware(), requireAuth);
app.use("/scan-image", clerkMiddleware(), authMiddleware);
app.use("/audio/*", clerkMiddleware(), requireAuth);

// FIX: Speaker routes now require auth too
app.use("/api/speaker/*", clerkMiddleware(), authMiddleware);

app.route("/api/speaker", speakerRouter);

app.get("/", (c) => {
  return c.text("Satark-AI API is Running!");
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
        audioData: result.audioData ?? null,
        fileHash: result.fileHash ?? null,
      })
      .returning({ id: scans.id });

    return inserted?.id ?? null;
  } catch (dbError) {
    console.error("Failed to save scan to DB:", dbError);
    return null;
  }
}

// --- 1. URL Scan Route ---
app.post("/scan", zValidator("json", AudioUploadSchema), async (c) => {
  const data = c.req.valid("json");
  const engineUrl = process.env.ENGINE_URL || "http://127.0.0.1:8000";

  // FIX: Use auth userId, not client-supplied
  const userId = c.get("userId") as string;

  if (!rateLimiter(userId || data.userId || "anonymous", RATE_LIMITS.default)) {
    return c.json({ error: "Rate limit exceeded." }, 429);
  }

  try {
    const response = await fetch(`${engineUrl}/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, userId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return c.json({ error: "Engine Error", details: errorText }, 500);
    }

    const result = await response.json();
    const scanId = await saveScanResult({ ...result, userId });

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

    // FIX: Use auth userId
    const userId = (c.get("userId") as string) || "anonymous";

    if (!file || !(file instanceof File)) {
      return c.json({ error: "File is required" }, 400);
    }

    if (!rateLimiter(userId, RATE_LIMITS.scanUpload)) {
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

    const audioData = Buffer.from(arrayBuffer).toString("base64");

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

    const savedId = await saveScanResult({
      ...result,
      userId,
      audioUrl: `uploaded://${file.name}`,
      fileHash,
      audioData,
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

    if (!apiUrl) {
      return c.json(
        { error: "Server Configuration Error: IMAGE_API_URL missing" },
        500,
      );
    }

    const body = await c.req.parseBody();
    const file = body["file"];

    // FIX: Use auth userId
    const userId = (c.get("userId") as string) || "anonymous";

    if (!file || !(file instanceof File)) {
      return c.json({ error: "Image file is required" }, 400);
    }

    if (!rateLimiter(String(userId), RATE_LIMITS.default)) {
      return c.json({ error: "Rate limit exceeded" }, 429);
    }

    const formData = new FormData();
    formData.append("file", file, file.name || "image.png");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const extRes = await fetch(apiUrl, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!extRes.ok) {
        const errorText = await extRes.text();
        console.error(`External API Rejected: ${extRes.status} - ${errorText}`);
        return c.json(
          {
            error: "Analysis Unavailable",
            details: `Status: ${extRes.status}`,
          },
          502,
        );
      }

      const data = await extRes.json();

      if (
        data.details?.toLowerCase().includes("updating") ||
        data.details?.toLowerCase().includes("loading") ||
        (data.confidenceScore === 0 &&
          !data.isDeepfake &&
          data.details?.includes("Unknown"))
      ) {
        return c.json(
          {
            error: "Model Loading",
            details:
              data.details ||
              "Analysis Model is currently updating. Please scan again in 15 seconds.",
            retryAfter: 15,
          },
          503,
        );
      }

      const isDeepfake = !!(
        data.is_deepfake ||
        data.is_fake ||
        data.fake ||
        data.prediction === "fake" ||
        data.isDeepfake
      );
      const confidence = Math.abs(
        Number(
          data.confidenceScore ??
            data.score ??
            data.confidence ??
            data.probability ??
            0,
        ),
      );

      const mappedResult = {
        userId: String(userId),
        audioUrl: `image_scan:${file.name}`,
        isDeepfake,
        confidenceScore: Math.min(confidence, 1.0),
        analysisDetails:
          data.details ||
          data.message ||
          data.reason ||
          "Image verification complete",
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
      console.error(`Network Crash: ${err?.message || err}`);
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
  // ╔════════════════════════════════════════════════════════════╗
  // ║  FIX: Auth already applied via middleware above.           ║
  // ║  Now also verify the audio belongs to the requesting user.║
  // ║  OLD: Anyone could access any user's audio by ID.         ║
  // ╚════════════════════════════════════════════════════════════╝
  const id = c.req.param("id");
  const userId = c.get("userId") as string;

  try {
    const scan = await db.query.scans.findFirst({
      where: eq(scans.id, Number(id)),
    });

    if (!scan || !scan.audioData) return c.text("Not found", 404);

    // FIX: Only allow users to access their own audio
    if (scan.userId !== userId) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const audioBuffer = Buffer.from(scan.audioData, "base64");
    return c.body(audioBuffer, 200, { "Content-Type": "audio/wav" });
  } catch (error) {
    return c.text("Error", 500);
  }
});

app.get("/scans", async (c) => {
  // ╔════════════════════════════════════════════════════════════╗
  // ║  FIX: Use auth userId instead of query parameter           ║
  // ║  OLD: const userId = c.req.query("userId")                ║
  // ║  Problem: Anyone could query any user's scan history       ║
  // ╚════════════════════════════════════════════════════════════╝
  const userId = c.get("userId") as string;

  if (!userId) return c.json({ error: "Unauthorized" }, 401);

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
  const userId = c.get("userId") as string;
  const { feedback } = await c.req.json();

  // FIX: Verify scan belongs to user before allowing feedback
  try {
    const scan = await db.query.scans.findFirst({
      where: eq(scans.id, Number(id)),
    });

    if (!scan) return c.json({ error: "Scan not found" }, 404);
    if (scan.userId !== userId) {
      return c.json({ error: "Forbidden" }, 403);
    }

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
