import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
  }

  const tenantId = session.user.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Your account is not linked to any organization. Please contact support." }, { status: 403 });
  }

  try {
    const hostel = await prisma.hostel.findFirst({
      where: { id: params.id, tenantId },
      include: {
        buildings: {
          include: {
            floors: {
              include: {
                rooms: {
                  include: { beds: true },
                },
              },
            },
          },
        },
        residents: {
          where: { status: "ACTIVE" },
          select: { id: true },
        },
        _count: {
          select: {
            residents: true,
            buildings: true,
            staff: true,
          },
        },
      },
    });

    if (!hostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    return NextResponse.json(hostel);
  } catch (error) {
    console.error("Get hostel error:", error);
    return NextResponse.json(
      { error: "Failed to fetch hostel" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
  }

  const tenantId = session.user.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Your account is not linked to any organization. Please contact support." }, { status: 403 });
  }

  if (session.user.role !== "TENANT_ADMIN" && session.user.role !== "HOSTEL_MANAGER") {
    return NextResponse.json({ error: "You don't have permission for this action" }, { status: 403 });
  }

  try {
    // Verify hostel belongs to tenant
    const existing = await prisma.hostel.findFirst({
      where: { id: params.id, tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, type, address, city, contact, status } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) {
      if (!["GOVERNMENT", "UNIVERSITY", "PRIVATE"].includes(type)) {
        return NextResponse.json(
          { error: "Invalid hostel type" },
          { status: 400 }
        );
      }
      updateData.type = type;
    }
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (contact !== undefined) updateData.contact = contact;
    // Billing settings
    if (body.billingCycle !== undefined) {
      if (["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"].includes(body.billingCycle)) {
        updateData.billingCycle = body.billingCycle;
      }
    }
    if (body.fixedFoodCharge !== undefined) updateData.fixedFoodCharge = parseFloat(body.fixedFoodCharge) || 0;
    if (body.billingDueDays !== undefined) updateData.billingDueDays = parseInt(body.billingDueDays) || 7;
    if (body.lateFeePercent !== undefined) updateData.lateFeePercent = parseFloat(body.lateFeePercent) || 0;

    // Payment method fields
    const paymentFields = ["jazzCashNumber", "jazzCashTitle", "easyPaisaNumber", "easyPaisaTitle", "bankName", "bankIBAN", "bankTitle"];
    for (const field of paymentFields) {
      if (body[field] !== undefined) updateData[field] = body[field] || null;
    }

    // Meal ordering time windows (0-23 hour values)
    const mealFields = [
      "breakfastStart", "breakfastEnd", "lunchStart", "lunchEnd",
      "dinnerStart", "dinnerEnd", "snackStart", "snackEnd",
    ];
    for (const field of mealFields) {
      if (body[field] !== undefined) {
        const val = parseInt(body[field]);
        if (!isNaN(val) && val >= 0 && val <= 23) {
          (updateData as any)[field] = val;
        }
      }
    }

    if (status !== undefined) {
      if (!["ACTIVE", "INACTIVE"].includes(status)) {
        return NextResponse.json(
          { error: "Invalid status" },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    const hostel = await prisma.hostel.update({
      where: { id: params.id },
      data: updateData,
    });

    // Save amenities if provided
    if (body.amenities && Array.isArray(body.amenities)) {
      // Delete existing amenities
      await prisma.hostelAmenity.deleteMany({ where: { hostelId: params.id } });
      // Create new ones
      if (body.amenities.length > 0) {
        await prisma.hostelAmenity.createMany({
          data: body.amenities.map((name: string) => ({
            name,
            category: "hostel",
            hostelId: params.id,
          })),
        });
      }
    }

    return NextResponse.json(hostel);
  } catch (error) {
    console.error("Update hostel error:", error);
    return NextResponse.json(
      { error: "Failed to update hostel" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
  }

  const tenantId = session.user.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Your account is not linked to any organization. Please contact support." }, { status: 403 });
  }

  if (session.user.role !== "TENANT_ADMIN") {
    return NextResponse.json({ error: "You don't have permission for this action" }, { status: 403 });
  }

  try {
    const existing = await prisma.hostel.findFirst({
      where: { id: params.id, tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    // Delete all related data in order (respecting foreign keys)
    await prisma.$transaction(async (tx) => {
      const hid = params.id;
      // Delete in dependency order
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
      await tx.expenseCategory.deleteMany({ where: { hostelId: hid } });
      await tx.staff.deleteMany({ where: { hostelId: hid } });
      await tx.managerHostel.deleteMany({ where: { hostelId: hid } });
      await tx.hostelAmenity.deleteMany({ where: { hostelId: hid } });
      // Residents: free beds first, then delete residents, then users
      const residents = await tx.resident.findMany({ where: { hostelId: hid }, select: { id: true, userId: true, bedId: true } });
      for (const r of residents) {
        await tx.bed.update({ where: { id: r.bedId }, data: { status: "VACANT" } }).catch(() => {});
      }
      await tx.resident.deleteMany({ where: { hostelId: hid } });
      // Delete resident user accounts
      for (const r of residents) {
        await tx.user.delete({ where: { id: r.userId } }).catch(() => {});
      }
      // Delete beds, rooms, floors, buildings
      await tx.bed.deleteMany({ where: { room: { floor: { building: { hostelId: hid } } } } });
      await tx.room.deleteMany({ where: { floor: { building: { hostelId: hid } } } });
      await tx.floor.deleteMany({ where: { building: { hostelId: hid } } });
      await tx.building.deleteMany({ where: { hostelId: hid } });
      // Finally delete the hostel
      await tx.hostel.delete({ where: { id: hid } });
    });

    return NextResponse.json({ message: "Hostel and all related data deleted successfully" });
  } catch (error) {
    console.error("Delete hostel error:", error);
    return NextResponse.json(
      { error: "Failed to delete hostel" },
      { status: 500 }
    );
  }
}
