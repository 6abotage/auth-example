import { Hono } from "hono";
import { issuer } from "@openauthjs/openauth"; // Correct import
import { CodeUI } from "@openauthjs/openauth/ui/code";
import { CodeProvider } from "@openauthjs/openauth/provider/code";
import { MemoryStorage } from "@openauthjs/openauth/storage/memory";
import { object, string } from "valibot";
import { createSubjects } from "@openauthjs/openauth/subject";
import { db, schema, testDbConnection } from "@auth-monorepo/database";
import { eq } from "drizzle-orm";
import "dotenv/config";
import { cors } from "hono/cors";

// --- Test DB Connection ---
testDbConnection().catch((err) => {
  console.error("FATAL: Database connection failed on startup.", err);
  process.exit(1);
});
// --- ---

// --- Subjects Definition ---
const subjects = createSubjects({
  user: object({
    id: string(),
    email: string(),
  }),
});
// --- ---

// --- Database User Logic (getUser function as before) ---
async function getUser(email: string): Promise<{ id: string; email: string }> {
  const existingUser = await db.query.users.findFirst({
    where: eq(schema.users.email, email),
  });
  if (existingUser) {
    console.log(
      `[Auth] Found existing user: ${email} (ID: ${existingUser.id})`
    );
    return { id: existingUser.id, email: existingUser.email };
  }
  console.log(`[Auth] Creating new user: ${email}`);
  try {
    const newUserResult = await db
      .insert(schema.users)
      .values({ email: email })
      .returning({ id: schema.users.id, email: schema.users.email });
    if (!newUserResult || newUserResult.length === 0) {
      throw new Error(
        `[Auth] Failed to retrieve created user data for email: ${email}`
      );
    }
    const newUser = newUserResult[0];
    if (!newUser) {
      throw new Error(
        `[Auth] Failed to create user (no user returned) for email: ${email}`
      );
    }
    console.log(
      `[Auth] Created new user: ${newUser.email} (ID: ${newUser.id})`
    );
    return newUser;
  } catch (error: any) {
    console.error(`[Auth] Error creating user for email ${email}:`, error);
    if (error.code === "23505") {
      console.warn(
        `[Auth] Race condition? User ${email} created concurrently. Refetching...`
      );
      const refetchedUser = await db.query.users.findFirst({
        where: eq(schema.users.email, email),
      });
      if (refetchedUser)
        return { id: refetchedUser.id, email: refetchedUser.email };
    }
    throw new Error(
      `[Auth] Failed to create/retrieve user for email: ${email}`
    );
  }
}
// --- ---

// --- Create OpenAuthJS Issuer App ---
// issuer() function returns the configured Hono app directly
const authApp = issuer({
  // This IS the Hono app
  subjects,
  storage: MemoryStorage(),
  providers: {
    code: CodeProvider(
      CodeUI({
        sendCode: async (email, code) => {
          console.log(`[Auth] Login code for ${email}: ${code}`);
        },
      })
    ),
  },
  success: async (ctx, value) => {
    if (value.provider === "code") {
      const email = value.claims.email as string | undefined;
      if (!email) {
        console.error(
          "[Auth] Success callback error: Email claim missing.",
          value.claims
        );
        throw new Error("Email claim missing after code authentication");
      }
      const user = await getUser(email);
      console.log(`[Auth] Issuing subject for user: ${user.email}`);
      return ctx.subject("user", {
        // Use the responder context 'ctx'
        id: user.id,
        email: user.email,
      });
    }
    throw new Error("[Auth] Success callback error: Invalid provider.");
  },
  // Optional: Add theme, ttl, allow, select configs here if needed based on docs
});
// --- ---

// --- Create Main Hono Wrapper App (Optional but good practice for CORS/other middleware) ---
const app = new Hono();
// --- ---

// --- CORS Middleware ---
// Apply CORS specifically to the /auth path before mounting the authApp
app.use(
  "/auth/*",
  cors({
    origin: (origin) => {
      // Allow specific frontend origins
      const allowedOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];
      return allowedOrigins.includes(origin) ? origin : null; // Return null to block others
    },
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 86400,
  })
);
// --- ---

// --- Mount OpenAuthJS Routes ---
app.route("/auth", authApp); // Mount the app returned by issuer()
// --- ---

// --- Health Check ---
app.get("/", (c) => c.json({ status: "ok", service: "auth-server-wrapper" }));
// --- ---

// --- Export for Bun ---
export default {
  port: 3001,
  fetch: app.fetch, // Export the fetch handler of the *wrapper* app
};
// --- ---
