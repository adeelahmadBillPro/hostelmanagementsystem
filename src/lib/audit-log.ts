import { prisma } from "./prisma";

/**
 * Log an audit event.
 */
export async function auditLog({
  action,
  entityType,
  entityId,
  userId,
  details,
  hostelId,
}: {
  action: string;       // CREATE, UPDATE, DELETE, APPROVE, REJECT, LOGIN, etc.
  entityType: string;   // resident, payment, bill, food_order, staff, etc.
  entityId?: string;
  userId: string;
  details?: string;
  hostelId?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entity: entityType,
        entityId: entityId || "",
        details: details || "",
        userId,
      },
    });
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    console.error("Audit log error:", error);
  }
}
