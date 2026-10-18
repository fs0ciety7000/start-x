import { timingSafeEqual } from "node:crypto";
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

const handlers = toNextJsHandler(auth);

async function guarded(request: Request) {
  const url = new URL(request.url);
  if (request.method === "POST" && url.pathname.endsWith("/sign-up/email")) {
    const expected = process.env.BOOTSTRAP_SETUP_TOKEN ?? "";
    const received = request.headers.get("x-init-setup-token") ?? "";
    const matches = expected.length > 0 && expected.length === received.length && timingSafeEqual(Buffer.from(expected), Buffer.from(received));
    if (!matches) {
      return Response.json({ message: "La configuration initiale est fermée." }, { status: 403, headers: { "Cache-Control": "no-store" } });
    }
    const client = await pool.connect();
    try {
      await client.query("SELECT pg_advisory_lock(7304891401)");
      const { rows } = await client.query('SELECT count(*)::int AS total FROM "user"');
      if (rows[0]?.total > 0) return Response.json({ message: "La configuration initiale est fermée." }, { status: 403, headers: { "Cache-Control": "no-store" } });
      return await handlers.POST(request);
    } finally {
      await client.query("SELECT pg_advisory_unlock(7304891401)").catch(() => undefined);
      client.release();
    }
  }
  return handlers.POST(request);
}

export const GET = handlers.GET;
export const POST = guarded;
