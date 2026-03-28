import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; billId: string } }
) {
  try {
    const session = await getSession();
    if (!session || !session.user.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hostel = await prisma.hostel.findFirst({
      where: { id: params.id, tenantId: session.user.tenantId },
    });
    if (!hostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    const bill = await prisma.monthlyBill.findFirst({
      where: { id: params.billId, hostelId: params.id },
      include: { payments: true },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    if (bill.payments.length > 0 || bill.paidAmount > 0) {
      return NextResponse.json(
        { error: "Cannot delete a bill that has payments recorded. Remove payments first." },
        { status: 400 }
      );
    }

    await prisma.monthlyBill.delete({ where: { id: params.billId } });

    return NextResponse.json({ message: "Bill deleted successfully" });
  } catch (error) {
    console.error("Delete bill error:", error);
    return NextResponse.json({ error: "Failed to delete bill" }, { status: 500 });
  }
}
