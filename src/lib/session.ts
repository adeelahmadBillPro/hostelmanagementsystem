import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { prisma } from "./prisma";

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

/**
 * Verify the user has access to a specific hostel.
 * - TENANT_ADMIN: hostel must belong to their tenant
 * - HOSTEL_MANAGER: must have a ManagerHostel record for this hostel
 * - SUPER_ADMIN: always allowed
 * Returns the hostel or null if unauthorized.
 */
export async function requireHostelAccess(
  hostelId: string,
  session: { user: { id: string; role: UserRole; tenantId: string | null } }
) {
  const role = session.user.role;

  if (role === "SUPER_ADMIN") {
    return await prisma.hostel.findUnique({ where: { id: hostelId } });
  }

  if (role === "TENANT_ADMIN") {
    return await prisma.hostel.findFirst({
      where: { id: hostelId, tenantId: session.user.tenantId! },
    });
  }

  if (role === "HOSTEL_MANAGER") {
    const assignment = await prisma.managerHostel.findUnique({
      where: {
        userId_hostelId: {
          userId: session.user.id,
          hostelId,
        },
      },
      include: { hostel: true },
    });
    return assignment?.hostel || null;
  }

  return null;
}

/**
 * For portal routes (RESIDENT/STAFF): validates session AND checks that the
 * user's account is still active (isActive=true). Returns null if revoked.
 */
export async function getPortalSession() {
  const session = await getSession();
  if (!session) return null;
  if (session.user.role !== "RESIDENT" && session.user.role !== "STAFF") return null;

  // Check DB to confirm isActive — JWT won't reflect post-checkout revocation
  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { isActive: true },
  });

  if (!user || !user.isActive) return null;
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
