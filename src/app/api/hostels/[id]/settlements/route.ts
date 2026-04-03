import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { calculateSettlement } from "@/lib/settlement";

// GET: Preview settlement calculation for a resident
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
    }

    const allowedRoles = ["TENANT_ADMIN", "HOSTEL_MANAGER", "SUPER_ADMIN"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const hostelId = params.id;

    // Verify hostel belongs to tenant
    const hostel = await prisma.hostel.findFirst({
      where: { id: hostelId, tenantId: session.user.tenantId! },
    });
    if (!hostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const residentId = searchParams.get("residentId");

    if (!residentId) {
      // Return settlement history
      const settlements = await prisma.settlement.findMany({
        where: { hostelId },
        include: {
          resident: {
            include: {
              user: { select: { name: true, email: true } },
              room: { select: { roomNumber: true } },
            },
          },
          completedBy: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      const stats = {
        total: settlements.length,
        totalDues: settlements.filter((s) => s.settlementType === "DUES").reduce((sum, s) => sum + s.netAmount, 0),
        totalRefunds: settlements.filter((s) => s.settlementType === "REFUND").reduce((sum, s) => sum + Math.abs(s.netAmount), 0),
        thisMonth: settlements.filter((s) => {
          const d = new Date(s.createdAt);
          const now = new Date();
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length,
      };

      return NextResponse.json({ settlements, stats });
    }

    // Calculate settlement preview
    const preview = await prisma.$transaction(async (tx) => {
      return calculateSettlement(residentId, new Date(), tx);
    });

    return NextResponse.json(preview);
  } catch (error: any) {
    console.error("GET settlement error:", error);
    return NextResponse.json({ error: error.message || "Failed to calculate settlement" }, { status: 500 });
  }
}

// POST: Complete checkout with settlement
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
    }

    const allowedRoles = ["TENANT_ADMIN", "HOSTEL_MANAGER", "SUPER_ADMIN"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const hostelId = params.id;

    // Verify hostel belongs to tenant
    const hostel = await prisma.hostel.findFirst({
      where: { id: hostelId, tenantId: session.user.tenantId! },
    });
    if (!hostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    const body = await request.json();
    const { residentId, damageCharges = 0, otherCharges = 0, lateCheckoutFee = 0, deductions, notes } = body;

    if (!residentId) {
      return NextResponse.json({ error: "residentId is required" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Calculate fresh settlement
      const preview = await calculateSettlement(residentId, new Date(), tx);

      // Add manager-entered charges
      const extraCharges = (parseFloat(damageCharges) || 0) + (parseFloat(otherCharges) || 0) + (parseFloat(lateCheckoutFee) || 0);
      const finalTotalCharges = preview.charges.totalCharges + extraCharges;
      const finalNet = Math.round(finalTotalCharges - preview.credits.totalCredits);
      const finalType = finalNet > 0 ? "DUES" : finalNet < 0 ? "REFUND" : "SETTLED";

      // Create settlement record
      const settlement = await tx.settlement.create({
        data: {
          residentId,
          hostelId,
          checkoutDate: new Date(),
          daysStayed: preview.stay.daysStayed,
          billingType: preview.resident.billingType,
          unpaidBills: preview.charges.unpaidBillsTotal,
          proRatedRent: preview.charges.proRatedRent,
          proRatedFood: preview.charges.proRatedFood,
          unbilledOrders: preview.charges.unbilledOrders,
          unbilledMeter: preview.charges.unbilledMeter,
          unbilledParking: preview.charges.unbilledParking,
          damageCharges: parseFloat(damageCharges) || 0,
          otherCharges: parseFloat(otherCharges) || 0,
          lateCheckoutFee: parseFloat(lateCheckoutFee) || 0,
          totalCharges: finalTotalCharges,
          securityDeposit: preview.credits.securityDeposit,
          advanceBalance: preview.credits.advanceBalance,
          overpayments: preview.credits.overpayments,
          totalCredits: preview.credits.totalCredits,
          netAmount: finalNet,
          settlementType: finalType,
          deductions: deductions || null,
          notes: notes || null,
          completedById: session.user.id,
        },
      });

      // Checkout: update resident status + free bed + revoke portal access
      const resident = await tx.resident.findUnique({
        where: { id: residentId },
        select: { bedId: true, userId: true },
      });

      await tx.resident.update({
        where: { id: residentId },
        data: { status: "CHECKED_OUT", moveOutDate: new Date() },
      });

      if (resident?.bedId) {
        await tx.bed.update({
          where: { id: resident.bedId },
          data: { status: "VACANT" },
        });
      }

      if (resident?.userId) {
        await tx.user.update({
          where: { id: resident.userId },
          data: { isActive: false },
        });
      }

      return { settlement, preview };
    });

    return NextResponse.json({
      message: "Checkout completed successfully",
      settlement: result.settlement,
      preview: result.preview,
    });
  } catch (error: any) {
    console.error("POST settlement error:", error);
    return NextResponse.json({ error: error.message || "Failed to complete checkout" }, { status: 500 });
  }
}
