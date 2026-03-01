import pg from "pg";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(join(__dirname, "../supabase/schema.sql"), "utf8");

const client = new pg.Client({
  connectionString: process.argv[2],
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log("Connected. Running schema...");
await client.query(schema);
console.log("Schema applied successfully.");
await client.end();
