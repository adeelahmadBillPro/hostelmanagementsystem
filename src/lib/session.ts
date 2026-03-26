import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";

export async function getSession() {
  return await getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function requireRole(roles: UserRole[]) {
  const session = await requireAuth();
  if (!roles.includes(session.user.role)) {
    redirect("/dashboard");
  }
  return session;
}

export function getRoleBasedRedirect(role: UserRole): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/super-admin/dashboard";
    case "TENANT_ADMIN":
      return "/dashboard";
    case "HOSTEL_MANAGER":
      return "/dashboard";
    case "RESIDENT":
      return "/portal/dashboard";
    case "STAFF":
      return "/portal/dashboard";
    default:
      return "/dashboard";
  }
}
