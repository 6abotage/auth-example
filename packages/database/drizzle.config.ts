import { defineConfig } from "drizzle-kit";
import "dotenv/config"; // Load .env variables

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts", // Path relative to this config file
  out: "./migrations", // Output directory relative to this config file
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
});
