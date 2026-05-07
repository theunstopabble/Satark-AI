/**
 * Satark-AI Cloudflare Proxy — Hugging Face Deepfake Detection Edition
 * Uses specialized deepfake model instead of general vision LLM.
 * Free tier via Hugging Face Inference API.
 * Enterprise-hardened: strict CORS, request tracing, size limits,
 * safe JSON parsing, and defensive timeout handling.
 */

// ── CONFIG ──
const ALLOWED_ORIGINS = [
  "https://satark-deepfake.vercel.app",
  "https://www.satark-deepfake.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

// Model 1: Face deepfake detection (specialized for human faces)
const HF_FACE_MODEL = "prithivMLmods/deepfake-detector-model-v1";
const HF_FACE_URL = `https://api-inference.huggingface.co/models/${HF_FACE_MODEL}`;

// Model 2: General AI-generated image detection (logos, art, illustrations)
// This detects Stable Diffusion, Midjourney, DALL-E, Flux generated images
const HF_AI_MODEL = "umm-maybe/ai-image-detector";
const HF_AI_URL = `https://api-inference.huggingface.co/models/${HF_AI_MODEL}`;

const HF_TIMEOUT_MS = 45000; // 45s (HF free tier has cold-start delays)

// ── HELPERS ──

/** Parse Hugging Face Inference API image-classification response. */
function parseHFDeepfakeResult(
  hfResponse: Array<{ label: string; score: number }>,
): { isDeepfake: boolean; confidenceScore: number; details: string } {
  // HF returns array like: [{label: "fake", score: 0.92}, {label: "real", score: 0.08}]
  const fakeEntry = hfResponse.find((r) => r.label === "fake");
  const realEntry = hfResponse.find((r) => r.label === "real");

  const fakeScore = fakeEntry?.score ?? 0;
  const realScore = realEntry?.score ?? 0;
  const total = fakeScore + realScore;

  // Normalize to 0-1 (handles case where model returns unnormalized logits)
  const normalizedFake = total > 0 ? fakeScore / total : fakeScore;

  const CONFIDENCE_THRESHOLD = 0.6;
  const isDeepfake = normalizedFake >= CONFIDENCE_THRESHOLD;

  let details: string;
  if (normalizedFake >= 0.85) {
    details = "High probability of AI-generated or manipulated content detected.";
  } else if (normalizedFake >= 0.6) {
    details = "Suspicious artifacts detected. Likely manipulated content.";
  } else if (normalizedFake >= 0.4) {
    details = "Some anomalies present but inconclusive. Recommend manual review.";
  } else {
    details = "No significant deepfake indicators detected. Image appears authentic.";
  }

  return {
    isDeepfake,
    confidenceScore: Math.max(0, Math.min(1, normalizedFake)),
    details,
  };
}

/** Build CORS headers based on origin. Unknown origins are rejected (no fallback). */
function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin);

  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
    "Access-Control-Max-Age": "86400",
  };

  if (allowed) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

/** Enterprise security headers for every response. */
function addSecurityHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  return {
    ...headers,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };
}

/** Generate a short trace ID for logging. */
function generateRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── MAIN WORKER ──
export interface Env {
  /** Hugging Face API token (free tier). Get from https://huggingface.co/settings/tokens */
  HF_API_TOKEN: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestId = generateRequestId();
    const corsHeaders = getCorsHeaders(request);

    // Reject only if Origin header is explicitly set to an unknown origin.
    // Server-to-server requests (no Origin header) are allowed since CORS is
    // a browser security mechanism, not applicable to backend-to-worker calls.
    const hasOrigin = request.headers.has("Origin");
    if (
      request.method !== "OPTIONS" &&
      hasOrigin &&
      !corsHeaders["Access-Control-Allow-Origin"]
    ) {
      return new Response(
        JSON.stringify({ error: "Origin not allowed" }),
        {
          status: 403,
          headers: addSecurityHeaders({
            "Content-Type": "application/json",
          }),
        },
      );
    }

    // ── PREFLIGHT ──
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: addSecurityHeaders(corsHeaders),
      });
    }

    // ── METHOD CHECK ──
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed. Use POST." }),
        {
          status: 405,
          headers: addSecurityHeaders({
            "Content-Type": "application/json",
            ...corsHeaders,
          }),
        },
      );
    }

    try {
      // ── API KEY CHECK ──
      if (!env.HF_API_TOKEN) {
        throw new Error("HF_API_TOKEN is missing in Cloudflare secrets. Get one free at https://huggingface.co/settings/tokens");
      }

      // ── EXTRACT IMAGE ──
      let imageBytes: ArrayBuffer | null = null;
      let mimeType = "image/jpeg";
      const contentType = request.headers.get("content-type") || "";

      if (contentType.includes("multipart")) {
        const formData = await request.formData();
        for (const [, value] of formData.entries()) {
          if (value instanceof File) {
            if (value.size > MAX_IMAGE_SIZE) {
              return new Response(
                JSON.stringify({
                  error: "Image too large",
                  details: `Max size is ${MAX_IMAGE_SIZE / (1024 * 1024)}MB. Got ${(value.size / (1024 * 1024)).toFixed(1)}MB.`,
                }),
                {
                  status: 413,
                  headers: addSecurityHeaders({
                    "Content-Type": "application/json",
                    ...corsHeaders,
                  }),
                },
              );
            }
            imageBytes = await value.arrayBuffer();
            mimeType = value.type || "image/jpeg";
            break;
          }
        }
      } else {
        // Raw body — guard via Content-Length header before reading
        const contentLength = parseInt(
          request.headers.get("content-length") || "0",
          10,
        );
        if (contentLength > MAX_IMAGE_SIZE) {
          return new Response(
            JSON.stringify({
              error: "Image too large",
              details: `Max size is ${MAX_IMAGE_SIZE / (1024 * 1024)}MB.`,
            }),
            {
              status: 413,
              headers: addSecurityHeaders({
                "Content-Type": "application/json",
                ...corsHeaders,
              }),
            },
          );
        }
        imageBytes = await request.arrayBuffer();
      }

      // ── VALIDATE IMAGE ──
      if (!imageBytes || imageBytes.byteLength === 0) {
        return new Response(
          JSON.stringify({
            error: "No image data",
            details: "Request body is empty or contains no image.",
          }),
          {
            status: 400,
            headers: addSecurityHeaders({
              "Content-Type": "application/json",
              ...corsHeaders,
            }),
          },
        );
      }

      // Double-check actual size (Content-Length can be spoofed)
      if (imageBytes.byteLength > MAX_IMAGE_SIZE) {
        return new Response(
          JSON.stringify({
            error: "Image too large",
            details: `Actual size ${(imageBytes.byteLength / (1024 * 1024)).toFixed(1)}MB exceeds limit.`,
          }),
          {
            status: 413,
            headers: addSecurityHeaders({
              "Content-Type": "application/json",
              ...corsHeaders,
            }),
          },
        );
      }

      // ── DUAL-MODEL APPROACH ──
      // Model 1: Face deepfake (great for human faces)
      // Model 2: General AI-image detector (logos, art, illustrations, landscapes)
      // If Model 1 is uncertain (low confidence), we query Model 2.

      async function callHFModel(
        modelUrl: string,
        label: string,
      ): Promise<
        | { success: true; data: Array<{ label: string; score: number }> }
        | { success: false; status: number; body: string }
      > {
        async function attempt(timeoutMs: number): Promise<Response> {
          const ctrl = new AbortController();
          const tId = setTimeout(() => ctrl.abort(), timeoutMs);
          try {
            return await fetch(modelUrl, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${env.HF_API_TOKEN}`,
                "Content-Type": mimeType,
              },
              body: imageBytes,
              signal: ctrl.signal,
            });
          } finally {
            clearTimeout(tId);
          }
        }

        // Attempt 1: standard timeout
        let res = await attempt(HF_TIMEOUT_MS);
        if (res.status === 503 || res.status === 504) {
          console.log(`[${requestId}] ${label} model cold-start (503). Retrying in 8s...`);
          await new Promise((r) => setTimeout(r, 8000));
          res = await attempt(60000); // longer timeout for retry
        }
        if (!res.ok) {
          const txt = await res.text();
          return { success: false, status: res.status, body: txt };
        }
        const json = (await res.json()) as Array<{ label: string; score: number }>;
        return { success: true, data: json };
      }

      // ── MODEL 1: Face Deepfake ──
      const faceResult = await callHFModel(HF_FACE_URL, "face");
      let faceData: ReturnType<typeof parseHFDeepfakeResult> | null = null;

      if (faceResult.success) {
        faceData = parseHFDeepfakeResult(faceResult.data);
        console.log(`[${requestId}] Face Model:`, JSON.stringify(faceData));
      } else {
        console.warn(
          `[${requestId}] Face model failed (${faceResult.status}):`,
          faceResult.body.slice(0, 200),
        );
      }

      // ── DECISION: Use face model if confident (>= 0.7), else try Model 2 ──
      const FACE_CONFIDENCE_THRESHOLD = 0.7;
      let finalResult = faceData;

      if (!finalResult || finalResult.confidenceScore < FACE_CONFIDENCE_THRESHOLD) {
        console.log(`[${requestId}] Face model uncertain. Trying general AI-image detector...`);

        const aiResult = await callHFModel(HF_AI_URL, "ai");
        if (aiResult.success) {
          // General AI detector may have different label schema.
          // Common: [{label: "artificial", score: 0.92}, {label: "human", score: 0.08}]
          const aiEntry = aiResult.data.find((r) =>
            ["artificial", "ai", "fake", "generated", "synthetic"].includes(
              r.label.toLowerCase(),
            ),
          );
          const realEntry = aiResult.data.find((r) =>
            ["human", "real", "natural", "authentic"].includes(r.label.toLowerCase()),
          );

          const aiScore = aiEntry?.score ?? 0;
          const realScore = realEntry?.score ?? 0;
          const total = aiScore + realScore;
          const normalizedAI = total > 0 ? aiScore / total : aiScore;

          console.log(`[${requestId}] AI Model Raw:`, JSON.stringify(aiResult.data));

          // Only override face model if AI model is more confident
          const aiDetected = normalizedAI >= 0.6;
          const aiConfidence = Math.max(0, Math.min(1, normalizedAI));

          if (!faceData || aiConfidence > faceData.confidenceScore) {
            let details: string;
            if (aiConfidence >= 0.85) {
              details = "High probability of AI-generated content (logos, illustrations, or synthetic art).";
            } else if (aiConfidence >= 0.6) {
              details = "Suspicious patterns suggest AI generation. Likely synthetic image.";
            } else {
              details = "No strong AI-generation indicators. Image appears authentic.";
            }

            finalResult = {
              isDeepfake: aiDetected,
              confidenceScore: aiConfidence,
              details,
            };
          }
        } else {
          console.warn(
            `[${requestId}] AI model failed (${aiResult.status}):`,
            aiResult.body.slice(0, 200),
          );
          // If both fail and no prior face data, return uncertain
          if (!finalResult) {
            finalResult = {
              isDeepfake: false,
              confidenceScore: 0.0,
              details: "Analysis inconclusive — detection models unavailable.",
            };
          }
        }
      }

      if (!finalResult) {
        finalResult = {
          isDeepfake: false,
          confidenceScore: 0.0,
          details: "Analysis inconclusive.",
        };
      }

      console.log(`[${requestId}] Final Result:`, JSON.stringify(finalResult));

      return new Response(JSON.stringify(finalResult), {
        status: 200,
        headers: addSecurityHeaders({
          "Content-Type": "application/json",
          ...corsHeaders,
        }),
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const errName = error instanceof Error ? error.name : "Error";
      console.error(`[${requestId}] Worker Error:`, errMsg);

      let status = 500;
      let errorType = "Internal error";

      if (errName === "AbortError") {
        status = 504;
        errorType = "Upstream timeout";
      }

      return new Response(
        JSON.stringify({
          error: errorType,
          details: errMsg,
        }),
        {
          status,
          headers: addSecurityHeaders({
            "Content-Type": "application/json",
            ...corsHeaders,
          }),
        },
      );
    }
  },
};
