import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db";
import { speakers, scans } from "../db/schema";
import { cosineDistance, desc, eq } from "drizzle-orm"; // wait, drizzle doesn't have cosineDistance helper easily for JSON
// I'll implement in-memory cosine similarity
import { stream } from "hono/streaming";

const app = new Hono();

// Helper for Cosine Similarity
function cosineSimilarity(a: number[], b: number[]) {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Engine URL
const ENGINE_URL = process.env.ENGINE_URL || "http://127.0.0.1:8000";

app.post("/enroll", async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body["file"];
    const name = body["name"] as string;
    const userId = (body["userId"] as string) || "guest"; // Should be from Auth

    if (!file || !(file instanceof File)) {
      return c.json({ error: "File required" }, 400);
    }
    if (!name) {
      return c.json({ error: "Name required" }, 400);
    }

    // 1. Send to Engine to get Embedding
    const formData = new FormData();
    formData.append("file", file);

    const engineRes = await fetch(`${ENGINE_URL}/embed`, {
      method: "POST",
      body: formData,
    });

    if (!engineRes.ok) {
      throw new Error("Engine embedding failed");
    }

    const { embedding } = (await engineRes.json()) as { embedding: number[] };

    // 2. Save to DB
    await db.insert(speakers).values({
      userId,
      name,
      embedding: embedding, // Stored as JSON
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

    if (!file || !(file instanceof File)) {
      return c.json({ error: "File required" }, 400);
    }

    // 1. Get Embedding
    const formData = new FormData();
    formData.append("file", file);

    const engineRes = await fetch(`${ENGINE_URL}/embed`, {
      method: "POST",
      body: formData,
    });

    if (!engineRes.ok) throw new Error("Engine embedding failed");
    const { embedding } = (await engineRes.json()) as { embedding: number[] };

    // 2. Fetch all speakers
    // Optimization: In production, use pgvector. Here, fetch all (assuming < 1000)
    const allSpeakers = await db.select().from(speakers);

    let bestMatch = { name: "Unknown", score: 0 };

    for (const spk of allSpeakers) {
      // Type casting for JSON field
      const storedEmbedding = spk.embedding as number[];
      const score = cosineSimilarity(embedding, storedEmbedding);

      if (score > bestMatch.score) {
        bestMatch = { name: spk.name, score };
      }
    }

    // Threshold
    const MATCH_THRESHOLD = 0.75; // Tunable
    const isMatch = bestMatch.score > MATCH_THRESHOLD;
    const details = isMatch
      ? `Matched with ${bestMatch.name} (${(bestMatch.score * 100).toFixed(1)}%)`
      : "No matching speaker found.";

    // Log to History
    const userId = (body["userId"] as string) || "guest";
    try {
      await db.insert(scans).values({
        userId,
        audioUrl: "Speaker Verification (File Upload)",
        isDeepfake: !isMatch, // No match = potential fake/impersonator
        confidenceScore: bestMatch.score * 100,
        analysisDetails: `Identity: ${details}`,
      });
    } catch (dbErr) {
      console.error("Values logging failed", dbErr);
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
