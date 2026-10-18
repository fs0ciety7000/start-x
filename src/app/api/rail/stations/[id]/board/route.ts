import { getAdminSession } from "@/lib/auth-guard";
import { railError, railFetch } from "@/lib/rail/proxy";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await getAdminSession()) return Response.json({ error: "Connexion requise." }, { status: 401 });
  const { id } = await context.params;
  if (!/^\d{7}$/.test(id)) return Response.json({ error: "Identifiant de gare invalide." }, { status: 400 });
  try {
    const upstream = await railFetch(`/api/stations/${id}/board`);
    if (!upstream.ok) return railError();
    return new Response(upstream.body, { status: 200, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store" } });
  } catch {
    return railError();
  }
}
