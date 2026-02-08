import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";

export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) {
    return c.json({ error: "Unauthorized", message: "No token provided" }, 401);
  }

  const token = authHeader.split(" ")[1];
  try {
    // In a real scenario with Clerk, you would use their SDK or JWKS verification.
    // For this boilerplate, we'll assume the token is passed and we might verify a secret or placeholder.
    // Ideally, use @hono/clerk-auth if available or manual JWT verification with Clerk's public key.

    // Placeholder for actual Clerk Verify Logic
    // const payload = await verify(token, process.env.CLERK_PEM_PUBLIC_KEY!)
    // c.set('jwtPayload', payload)

    await next();
  } catch (e) {
    return c.json({ error: "Unauthorized", message: "Invalid token" }, 401);
  }
});
