import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { dashboardConfig } from "@/lib/db/schema";
import { defaultConfig, dashboardConfigSchema, type DashboardConfig } from "@/lib/config";

export async function readDashboardConfig(): Promise<DashboardConfig> {
  const [row] = await db.select({ config: dashboardConfig.config }).from(dashboardConfig).where(eq(dashboardConfig.id, 1)).limit(1);
  if (!row) return defaultConfig;
  const parsed = dashboardConfigSchema.safeParse(row.config);
  return parsed.success ? parsed.data : defaultConfig;
}

export async function writeDashboardConfig(config: DashboardConfig) {
  await db.insert(dashboardConfig)
    .values({ id: 1, config })
    .onConflictDoUpdate({ target: dashboardConfig.id, set: { config, updatedAt: new Date() } });
}
