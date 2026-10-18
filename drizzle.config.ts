import { defineConfig } from "drizzle-kit";

try { process.loadEnvFile(); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }

export default defineConfig({
  dialect: "postgresql",
  schema: "src/lib/db/schema.ts",
  out: "drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "postgres://init:init@localhost:5432/init" },
});
