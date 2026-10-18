import { getAdminSession } from "@/lib/auth-guard";
import { dashboardConfigSchema } from "@/lib/config";
import { readDashboardConfig, writeDashboardConfig } from "@/lib/config-store";

export async function GET() {
  if (!await getAdminSession()) return Response.json({ error: "Connexion requise." }, { status: 401 });
  return Response.json(await readDashboardConfig(), { headers: { "Cache-Control": "private, no-store" } });
}

export async function PUT(request: Request) {
  if (!await getAdminSession()) return Response.json({ error: "Connexion requise." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const parsed = dashboardConfigSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Paramètres invalides.", details: parsed.error.flatten() }, { status: 400 });
  await writeDashboardConfig(parsed.data);
  return Response.json(parsed.data, { headers: { "Cache-Control": "private, no-store" } });
}
