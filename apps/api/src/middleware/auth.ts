import { createMiddleware } from "hono/factory";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";

export const authMiddleware = createMiddleware(async (c, next) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "Unauthorized", message: "Valid session required" }, 401);
  }
  await next();
});
