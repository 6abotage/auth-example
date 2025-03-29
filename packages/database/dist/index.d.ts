import "dotenv/config";
import * as schemaDefs from "./schema.js";
export declare const db: import("drizzle-orm/node-postgres").NodePgDatabase<typeof schemaDefs>;
export declare const schema: typeof schemaDefs;
export declare function testDbConnection(): Promise<void>;
