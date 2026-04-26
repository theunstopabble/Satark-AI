import { Hono } from "hono";
import { db } from "../db";
import { speakers, scans } from "../db/schema";
import { eq, and } from "drizzle-orm";

const app = new Hono();

// Helper for Cosine Similarity
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0.0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0.0;
  const result = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.round(result * 10000) / 10000;
}

const ENGINE_URL = process.env.ENGINE_URL || "http://127.0.0.1:8000";

app.post("/enroll", async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body["file"];
    const name = body["name"] as string;

    // ╔════════════════════════════════════════════════════════════╗
    // ║  FIX: Get userId from auth context, NOT from request body ║
    // ║  OLD: const userId = (body["userId"] as string) || "guest" ║
    // ║  This was a security vulnerability — any user could        ║
    // ║  impersonate any other user by sending their userId.       ║
    // ╚════════════════════════════════════════════════════════════╝
    const userId = c.get("userId") as string;

    if (!file || !(file instanceof File)) {
      return c.json({ error: "File required" }, 400);
    }
    if (!name) {
      return c.json({ error: "Name required" }, 400);
    }

    // 1. Send to Engine to get Embedding
    const formData = new FormData();
    formData.append("file", file, file.name || "audio_record.wav");

    const engineRes = await fetch(`${ENGINE_URL}/embed`, {
      method: "POST",
      body: formData,
    });

    if (!engineRes.ok) {
      const errText = await engineRes.text();
      console.error("Engine embed failed:", errText);
      throw new Error("Engine embedding failed");
    }

    const { embedding } = (await engineRes.json()) as { embedding: number[] };

    // 2. Save to DB
    await db.insert(speakers).values({
      userId,
      name,
      embedding: embedding,
    });

    return c.json({ success: true, message: "Speaker enrolled successfully" });
  } catch (e) {
    console.error(e);
    return c.json({ error: String(e) }, 500);
  }
});

app.post("/verify", async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body["file"];

    // FIX: Get userId from auth context
    const userId = c.get("userId") as string;

    if (!file || !(file instanceof File)) {
      return c.json({ error: "File required" }, 400);
    }

    // 1. Get Embedding
    const formData = new FormData();
    formData.append("file", file, file.name || "audio_verify.wav");

    const engineRes = await fetch(`${ENGINE_URL}/embed`, {
      method: "POST",
      body: formData,
    });

    if (!engineRes.ok) throw new Error("Engine embedding failed");
    const { embedding } = (await engineRes.json()) as { embedding: number[] };

    // ╔════════════════════════════════════════════════════════════╗
    // ║  FIX: Only fetch THIS user's speakers, not ALL speakers   ║
    // ║  OLD: const allSpeakers = await db.select().from(speakers) ║
    // ║  Problem: User A's voice could match User B's speaker.     ║
    // ╚════════════════════════════════════════════════════════════╝
    const userSpeakers = await db
      .select()
      .from(speakers)
      .where(eq(speakers.userId, userId));

    if (!userSpeakers || userSpeakers.length === 0) {
      return c.json({
        success: true,
        isMatch: false,
        details:
          "No enrolled speakers found. Please enroll a reference voice first.",
      });
    }

    let bestMatch = { name: "Unknown", score: 0 };

    for (const spk of userSpeakers) {
      const storedEmbedding = spk.embedding as number[];
      const score = cosineSimilarity(embedding, storedEmbedding);

      if (score > bestMatch.score) {
        bestMatch = { name: spk.name, score };
      }
    }

    const MATCH_THRESHOLD = 0.75;
    const isMatch = bestMatch.score > MATCH_THRESHOLD;
    const details = isMatch
      ? `Matched with ${bestMatch.name} (${(bestMatch.score * 100).toFixed(1)}%)`
      : "No matching speaker found.";

    // Log to History
    try {
      await db.insert(scans).values({
        userId,
        audioUrl: "Speaker Verification (File Upload)",
        isDeepfake: false,
        confidenceScore: bestMatch.score,
        analysisDetails: isMatch
          ? `Identity: ${details}`
          : "Identity Mismatch - Unknown Speaker",
      });
    } catch (dbErr) {
      console.error("History logging failed", dbErr);
    }

    return c.json({
      isMatch,
      name: isMatch ? bestMatch.name : "Unknown",
      score: bestMatch.score,
      details,
    });
  } catch (e) {
    console.error(e);
    return c.json({ error: String(e) }, 500);
  }
});

export default app;
