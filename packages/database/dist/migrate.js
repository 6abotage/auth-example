import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import "dotenv/config";
import path from "path"; // Use path for robustness
import { fileURLToPath } from "url"; // To get __dirname in ESM
// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Ensure DATABASE_URL is set
if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required for migration");
}
// Construct the path to the migrations folder relative to this script
const migrationsPath = path.join(__dirname, "..", "migrations"); // Go up one level from src to find migrations/
async function runMigrations() {
    console.log("Starting database migration from package...");
    console.log(`Looking for migrations in: ${migrationsPath}`);
    const migrationPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 1,
    });
    try {
        const db = drizzle(migrationPool);
        await migrate(db, { migrationsFolder: migrationsPath }); // Use the calculated path
        console.log("Migrations applied successfully!");
    }
    catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
    finally {
        await migrationPool.end();
        console.log("Migration connection closed.");
    }
}
runMigrations();
//# sourceMappingURL=migrate.js.map