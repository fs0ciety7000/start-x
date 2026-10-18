import { getAdminSession } from "@/lib/auth-guard";
import { railError, railFetch } from "@/lib/rail/proxy";

export async function GET() {
  if (!await getAdminSession()) return Response.json({ error: "Connexion requise." }, { status: 401 });
  try {
    const upstream = await railFetch("/api/network");
    if (!upstream.ok) return railError();
    return new Response(upstream.body, {
      status: 200,
      headers: { "Content-Type": "application/octet-stream", "Cache-Control": "private, max-age=3600", ...(upstream.headers.get("etag") ? { ETag: upstream.headers.get("etag")! } : {}) },
    });
  } catch {
    return railError();
  }
}
