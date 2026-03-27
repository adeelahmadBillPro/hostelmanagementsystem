import { prisma } from "./prisma";

/**
 * Verify hostel exists and belongs to the given tenant.
 * Returns the hostel or null if not found/unauthorized.
 */
export async function getVerifiedHostel(hostelId: string, tenantId: string) {
  const hostel = await prisma.hostel.findFirst({
    where: { id: hostelId, tenantId },
  });
  return hostel;
}
