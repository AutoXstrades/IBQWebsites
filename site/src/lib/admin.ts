import { redirect } from "next/navigation";
import { auth } from "@/auth";
export async function requireAdmin(fresh = false) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!process.env.ADMIN_EMAIL || session.user.email?.toLowerCase() !== process.env.ADMIN_EMAIL.toLowerCase()) redirect("/account");
  if (fresh && Date.now() - session.user.authenticatedAt > 15 * 60000) redirect("/login?reauth=1");
  return session;
}
