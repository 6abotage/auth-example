import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import "dotenv/config"; // Load .env variables
// Assuming schema.ts is in the same directory
import * as schemaDefs from "./schema.js"; // Use .js extension
if (!process.env.DATABASE_URL) {
    // Consider throwing or having a default dev URL
    console.warn("DATABASE_URL environment variable not set. Using default development URL.");
    // Or throw new Error('DATABASE_URL environment variable is required');
}
// Use env var or a default (adjust default as needed)
const connectionString = process.env.DATABASE_URL ||
    "postgresql://drizzle_user:drizzle_password@localhost:5432/auth_db";
// Create a connection pool
const pool = new Pool({
    connectionString: connectionString,
    // ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});
// Create the Drizzle instance
// Logger can be configured based on an env var too, e.g., process.env.DB_LOGGING === 'true'
export const db = drizzle(pool, {
    schema: schemaDefs,
    logger: process.env.NODE_ENV !== "production",
});
// Export the schema definitions directly if needed by consumers
export const schema = schemaDefs;
// Optional: Function to test connection
export async function testDbConnection() {
    try {
        await pool.query("SELECT NOW()");
        console.log("Database connection successful!");
    }
    catch (error) {
        console.error("Database connection failed:", error);
        // Decide if failure here should halt the process
        // process.exit(1); // Maybe not ideal for a reusable package
        throw error; // Re-throw the error for the consumer to handle
    }
}
// Optional: Export the pool if consumers need direct access (less common)
// export { pool };
//# sourceMappingURL=index.js.map