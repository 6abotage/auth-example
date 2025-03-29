import { pgTable, text, timestamp, } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import crypto from "crypto"; // Node.js crypto module for UUID generation
export const users = pgTable("users", {
    // Use text for ID and generate UUID in the application to match original logic
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    email: text("email").notNull().unique(), // Ensure email is unique
    createdAt: timestamp("created_at")
        .default(sql `now()`)
        .notNull(),
});
// Optional: Explicitly define the unique index if needed elsewhere,
// although .unique() on the column definition often suffices.
// export const usersEmailIdx = uniqueIndex('users_email_idx').on(users.email);
// You could add more tables here later (e.g., sessions, accounts)
//# sourceMappingURL=schema.js.map