import { getAdminSession } from "@/lib/auth-guard";
import { railError, railFetch } from "@/lib/rail/proxy";

export async function GET() {
  if (!await getAdminSession()) return Response.json({ error: "Connexion requise." }, { status: 401 });
  try {
    const upstream = await railFetch("/api/health");
    if (!upstream.ok) return railError();
    return new Response(upstream.body, { status: 200, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store" } });
  } catch {
    return railError();
  }
}
