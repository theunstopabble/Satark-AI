import { createMiddleware } from "hono/factory";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";

export const authMiddleware = createMiddleware(async (c, next) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json(
      { error: "Unauthorized", message: "Valid session required" },
      401,
    );
  }

  // FIX: Store userId in context so routes can use it
  // instead of trusting client-supplied userId
  c.set("userId", auth.userId);

  await next();
});

// FIX: Lightweight auth check — returns userId if available, null if not
// Used for routes like /scans and /audio/:id that need auth but
// were previously unprotected
export const requireAuth = createMiddleware(async (c, next) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "Unauthorized", message: "Sign in required" }, 401);
  }
  c.set("userId", auth.userId);
  await next();
});
