import { issuer } from "@openauthjs/openauth";
import { CodeUI } from "@openauthjs/openauth/ui/code";
import { createSubjects } from "@openauthjs/openauth/subject";
import { CodeProvider } from "@openauthjs/openauth/provider/code";
import { object, string } from "valibot";
import { MemoryStorage } from "@openauthjs/openauth/storage/memory";
import { db, schema } from "@auth-monorepo/database"; // Import db and schema
import { eq } from "drizzle-orm";

async function getUser(email: string): Promise<string> {
  console.log(`[Auth] Getting User for email: ${email}`);

  try {
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    if (existingUser) {
      console.log(`[Auth] Found existing user: ${email} (ID: ${existingUser.id})`);
      return existingUser.id; // Return the user ID from the database
    }

    // Create a new user if one doesn't exist
    console.log(`[Auth] Creating new user: ${email}`);
    const newUserResult = await db
      .insert(schema.users)
      .values({ email: email })
      .returning({ id: schema.users.id });

    if (!newUserResult || newUserResult.length === 0) {
      throw new Error(`[Auth] Failed to create user for email: ${email}`);
    }

    const newUserID = newUserResult[0].id;
    console.log(`[Auth] Created new user: ${email} (ID: ${newUserID})`);
    return newUserID; // Return the newly created user's ID
  } catch (error) {
    console.error(`[Auth] Error getting or creating user:`, error);
    throw new Error("Failed to get or create user.");
  }
}

const subjects = createSubjects({
  user: object({
    userID: string(),
    workspaceID: string(),
  }),
});

const app = issuer({
  providers: {
    code: CodeProvider(
      CodeUI({
        sendCode: async (email: string, code: string) => {
          console.log(`[Auth] Sending code ${code} to email ${email}`);
          // Email integration implementation goes here
        },
      })
    ),
  },
  storage: MemoryStorage(),
  subjects,
  success: async (ctx, value) => {
    if (value.provider === "code") {
      const email = value.claims.email;

      if (typeof email !== "string") {
        console.error("[Auth] Email not found in claims or not a string:", value.claims);
        throw new Error("Email not found in claims, or not a valid string.");
      }

      try {
        const userID = await getUser(email);
        console.log(`[Auth] Successfully got user ID: ${userID} for email ${email}`);
        return ctx.subject("user", {
          userID: userID,
          workspaceID: "",
        });
      } catch (error) {
        console.error("[Auth] Error getting user:", error);
        throw new Error("Failed to get user during success callback.");
      }
    }

    throw new Error("Invalid provider");
  },
});

console.log("Hello via Bun!");

export default app;