import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// PATCH: Manager edits a bill
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; residentId: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers and admins can edit bills
    const allowedRoles = ["TENANT_ADMIN", "HOSTEL_MANAGER", "SUPER_ADMIN"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const hostelId = params.id;
    const residentId = params.residentId;
    const body = await req.json();

    const {
      billId,
      roomRent,
      foodCharges,
      otherCharges,
      meterCharges,
      parkingFee,
      discount,
      discountReason,
      notes,
      dueDate,
    } = body;

    if (!billId) {
      return NextResponse.json(
        { error: "billId is required" },
        { status: 400 }
      );
    }

    // Find the bill
    const bill = await prisma.monthlyBill.findFirst({
      where: {
        id: billId,
        hostelId,
        residentId,
      },
    });

    if (!bill) {
      return NextResponse.json(
        { error: "Bill not found" },
        { status: 404 }
      );
    }

    // Build updated values
    const updatedRoomRent = roomRent !== undefined ? parseFloat(roomRent) : bill.roomRent;
    const updatedFoodCharges = foodCharges !== undefined ? parseFloat(foodCharges) : bill.foodCharges;
    const updatedOtherCharges = otherCharges !== undefined ? parseFloat(otherCharges) : bill.otherCharges;
    const updatedMeterCharges = meterCharges !== undefined ? parseFloat(meterCharges) : bill.meterCharges;
    const updatedParkingFee = parkingFee !== undefined ? parseFloat(parkingFee) : bill.parkingFee;
    const updatedDiscount = discount !== undefined ? parseFloat(discount) : bill.discount;

    // Recalculate totals
    const totalAmount =
      updatedRoomRent +
      updatedFoodCharges +
      updatedOtherCharges +
      updatedMeterCharges +
      updatedParkingFee +
      bill.previousBalance -
      bill.advanceDeduction -
      updatedDiscount;

    const balance = totalAmount - bill.paidAmount;

    // Determine status based on new balance
    let status: "PAID" | "PARTIAL" | "UNPAID" | "OVERDUE" = "UNPAID";
    if (balance <= 0) {
      status = "PAID";
    } else if (bill.paidAmount > 0) {
      status = "PARTIAL";
    } else if (bill.dueDate && new Date(bill.dueDate) < new Date()) {
      status = "OVERDUE";
    }

    // Update the bill
    const updatedBill = await prisma.monthlyBill.update({
      where: { id: billId },
      data: {
        roomRent: updatedRoomRent,
        foodCharges: updatedFoodCharges,
        otherCharges: updatedOtherCharges,
        meterCharges: updatedMeterCharges,
        parkingFee: updatedParkingFee,
        discount: updatedDiscount,
        discountReason: discountReason !== undefined ? discountReason : bill.discountReason,
        notes: notes !== undefined ? notes : bill.notes,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : bill.dueDate,
        totalAmount: Math.max(0, totalAmount),
        balance: Math.max(0, balance),
        status,
      },
      include: {
        resident: {
          include: {
            user: { select: { name: true } },
            room: { select: { roomNumber: true } },
          },
        },
      },
    });

    return NextResponse.json(updatedBill);
  } catch (error) {
    console.error("Error editing bill:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
