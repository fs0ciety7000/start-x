import { count } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Dashboard } from "@/components/dashboard";
import { db } from "@/lib/db";
import { readDashboardConfig } from "@/lib/config-store";
import { user } from "@/lib/db/schema";
import { getAdminSession } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [{ total }] = await db.select({ total: count() }).from(user);
  if (total === 0) redirect("/setup");
  if (!await getAdminSession()) redirect("/login");
  return <Dashboard initialConfig={await readDashboardConfig()} />;
}
