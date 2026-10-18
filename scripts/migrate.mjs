import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

try { process.loadEnvFile(); } catch (error) { if (error?.code !== "ENOENT") throw error; }
const { Pool } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  await pool.query("CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
  const files = (await readdir(path.join(root, "drizzle"))).filter((name) => name.endsWith(".sql")).sort();
  for (const name of files) {
    const seen = await pool.query("SELECT 1 FROM schema_migrations WHERE name = $1", [name]);
    if (seen.rowCount) continue;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(await readFile(path.join(root, "drizzle", name), "utf8"));
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [name]);
      await client.query("COMMIT");
      console.log(`Migration appliquée: ${name}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
} finally {
  await pool.end();
}
