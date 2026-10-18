import { count } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const [{ total }] = await db.select({ total: count() }).from(user);
  if (total > 0) redirect("/login");
  return <AuthForm mode="setup" />;
}
