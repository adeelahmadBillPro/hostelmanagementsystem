import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
  }

  const { id } = params;
  const body = await request.json();

  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (body.status !== undefined) updateData.status = body.status;
  if (body.name !== undefined) updateData.name = body.name;
  if (body.email !== undefined) updateData.email = body.email;
  if (body.phone !== undefined) updateData.phone = body.phone;
  if (body.planId !== undefined) updateData.planId = body.planId || null;

  const updated = await prisma.tenant.update({
    where: { id },
    data: updateData,
    include: {
      plan: { select: { id: true, name: true } },
      _count: { select: { hostels: true, users: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
  }

  const { id } = params;

  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  // Delete all hostels and their data first
  const hostels = await prisma.hostel.findMany({ where: { tenantId: id }, select: { id: true } });

  for (const hostel of hostels) {
    const hid = hostel.id;
    await prisma.$transaction(async (tx) => {
      // New models first
      await tx.settlement.deleteMany({ where: { hostelId: hid } }).catch(() => {});
      await tx.leaveNotice.deleteMany({ where: { hostelId: hid } }).catch(() => {});
      await tx.staffAttendance.deleteMany({ where: { hostelId: hid } }).catch(() => {});
      await tx.message.deleteMany({ where: { conversation: { hostelId: hid } } }).catch(() => {});
      // Original models
      await tx.billDispute.deleteMany({ where: { bill: { hostelId: hid } } });
      await tx.paymentProof.deleteMany({ where: { bill: { hostelId: hid } } });
      await tx.payment.deleteMany({ where: { hostelId: hid } });
      await tx.monthlyBill.deleteMany({ where: { hostelId: hid } });
      await tx.foodOrder.deleteMany({ where: { hostelId: hid } });
      await tx.foodMenu.deleteMany({ where: { hostelId: hid } });
      await tx.meterReading.deleteMany({ where: { hostelId: hid } });
      await tx.visitor.deleteMany({ where: { hostelId: hid } });
      await tx.gatePass.deleteMany({ where: { hostelId: hid } });
      await tx.complaint.deleteMany({ where: { hostelId: hid } });
      await tx.notice.deleteMany({ where: { hostelId: hid } });
      await tx.parking.deleteMany({ where: { hostelId: hid } });
      await tx.roomTransfer.deleteMany({ where: { resident: { hostelId: hid } } });
      await tx.conversation.deleteMany({ where: { hostelId: hid } }).catch(() => {});
      await tx.expense.deleteMany({ where: { hostelId: hid } });
      await tx.expenseCategory.deleteMany({ where: { hostelId: hid } }).catch(() => {});
      await tx.staffSalary.deleteMany({ where: { staff: { hostelId: hid } } }).catch(() => {});
      await tx.staff.deleteMany({ where: { hostelId: hid } });
      await tx.managerHostel.deleteMany({ where: { hostelId: hid } });
      await tx.hostelAmenity.deleteMany({ where: { hostelId: hid } });
      const residents = await tx.resident.findMany({ where: { hostelId: hid }, select: { id: true, userId: true, bedId: true } });
      await tx.resident.deleteMany({ where: { hostelId: hid } });
      for (const r of residents) {
        await tx.user.delete({ where: { id: r.userId } }).catch(() => {});
      }
      await tx.roomInventory.deleteMany({ where: { room: { floor: { building: { hostelId: hid } } } } }).catch(() => {});
      await tx.bed.deleteMany({ where: { room: { floor: { building: { hostelId: hid } } } } });
      await tx.room.deleteMany({ where: { floor: { building: { hostelId: hid } } } });
      await tx.floor.deleteMany({ where: { building: { hostelId: hid } } });
      await tx.building.deleteMany({ where: { hostelId: hid } });
      await tx.hostel.delete({ where: { id: hid } });
    });
  }

  // Delete tenant-level data
  await prisma.auditLog.deleteMany({ where: { user: { tenantId: id } } }).catch(() => {});
  await prisma.managerSalary.deleteMany({ where: { user: { tenantId: id } } }).catch(() => {});
  await prisma.managerHostel.deleteMany({ where: { user: { tenantId: id } } }).catch(() => {});
  await prisma.user.deleteMany({ where: { tenantId: id } });
  await prisma.tenant.delete({ where: { id } });

  return NextResponse.json({ message: "Tenant and all data deleted successfully" });
}
