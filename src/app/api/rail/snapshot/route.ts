import { getAdminSession } from "@/lib/auth-guard";
import { railError, railFetch } from "@/lib/rail/proxy";

export async function GET() {
  if (!await getAdminSession()) return Response.json({ error: "Connexion requise." }, { status: 401 });
  try {
    const upstream = await railFetch("/api/snapshot");
    if (!upstream.ok) return railError("Les positions de trains sont temporairement indisponibles.");
    return new Response(upstream.body, { status: 200, headers: { "Content-Type": "application/octet-stream", "Cache-Control": "private, no-store" } });
  } catch {
    return railError("Les positions de trains sont temporairement indisponibles.");
  }
}
