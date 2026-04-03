import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; residentId: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
    }

    const hostelId = params.id;
    const residentId = params.residentId;

    const hostel = await prisma.hostel.findFirst({
      where: { id: hostelId, tenantId: session.user.tenantId! },
    });
    if (!hostel) {
      return NextResponse.json({ error: "The requested item was not found" }, { status: 404 });
    }

    const resident = await prisma.resident.findFirst({
      where: { id: residentId, hostelId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            cnic: true,
            image: true,
          },
        },
        room: {
          select: {
            id: true,
            roomNumber: true,
            type: true,
            rentPerBed: true,
            floor: {
              select: {
                id: true,
                name: true,
                floorNumber: true,
                building: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
        bed: {
          select: { id: true, bedNumber: true, status: true },
        },
        payments: {
          include: {
            bill: {
              select: { id: true, month: true, year: true },
            },
          },
          orderBy: { date: "desc" },
        },
        foodOrders: {
          include: {
            menu: {
              select: { id: true, itemName: true, mealType: true },
            },
          },
          orderBy: { orderDate: "desc" },
          take: 50,
        },
        complaints: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        monthlyBills: {
          orderBy: [{ year: "desc" }, { month: "desc" }],
        },
      },
    });

    if (!resident) {
      return NextResponse.json({ error: "Resident not found" }, { status: 404 });
    }

    // Calculate financial summary
    const totalPaid = resident.payments.reduce((sum, p) => sum + p.amount, 0);
    const totalBilled = resident.monthlyBills.reduce(
      (sum, b) => sum + b.totalAmount,
      0
    );
    const outstandingBalance = totalBilled - totalPaid;

    return NextResponse.json({
      ...resident,
      financialSummary: {
        totalPaid,
        totalBilled,
        outstandingBalance: Math.max(0, outstandingBalance),
        advanceLeft: resident.advancePaid,
        securityDeposit: resident.securityDeposit,
      },
    });
  } catch (error) {
    console.error("GET resident detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch resident" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; residentId: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
    }

    const hostelId = params.id;
    const residentId = params.residentId;

    const hostel = await prisma.hostel.findFirst({
      where: { id: hostelId, tenantId: session.user.tenantId! },
    });
    if (!hostel) {
      return NextResponse.json({ error: "The requested item was not found" }, { status: 404 });
    }

    const resident = await prisma.resident.findFirst({
      where: { id: residentId, hostelId },
    });
    if (!resident) {
      return NextResponse.json({ error: "Resident not found" }, { status: 404 });
    }

    const body = await request.json();
    const { action } = body;

    // Checkout action
    if (action === "checkout") {
      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.resident.update({
          where: { id: residentId },
          data: { status: "CHECKED_OUT", moveOutDate: new Date() },
        });

        await tx.bed.update({
          where: { id: resident.bedId },
          data: { status: "VACANT" },
        });

        // Revoke portal access on checkout
        await tx.user.update({
          where: { id: resident.userId },
          data: { isActive: false },
        });

        return updated;
      });

      return NextResponse.json(result);
    }

    // Update personal info
    const {
      name,
      email,
      phone,
      cnic,
      gender,
      institution,
      bloodGroup,
      medicalCondition,
      emergencyContact,
      emergencyPhone,
      foodPlan,
      customFoodFee,
    } = body;

    const result = await prisma.$transaction(async (tx) => {
      if (name || email || phone || cnic) {
        const userData: any = {};
        if (name) userData.name = name;
        if (email) userData.email = email;
        if (phone !== undefined) userData.phone = phone || null;
        if (cnic !== undefined) userData.cnic = cnic ? cnic.replace(/\D/g, "") : null;

        await tx.user.update({
          where: { id: resident.userId },
          data: userData,
        });
      }

      const residentData: any = {};
      if (gender !== undefined) residentData.gender = gender || null;
      if (institution !== undefined) residentData.institution = institution || null;
      if (bloodGroup !== undefined) residentData.bloodGroup = bloodGroup || null;
      if (medicalCondition !== undefined)
        residentData.medicalCondition = medicalCondition || null;
      if (emergencyContact !== undefined)
        residentData.emergencyContact = emergencyContact || null;
      if (emergencyPhone !== undefined)
        residentData.emergencyPhone = emergencyPhone || null;
      if (foodPlan !== undefined && ["FULL_MESS", "NO_MESS", "CUSTOM"].includes(foodPlan))
        residentData.foodPlan = foodPlan;
      if (customFoodFee !== undefined)
        residentData.customFoodFee = parseFloat(customFoodFee) || 0;

      const updated = await tx.resident.update({
        where: { id: residentId },
        data: residentData,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              cnic: true,
              image: true,
            },
          },
        },
      });

      return updated;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("PATCH resident error:", error);
    return NextResponse.json(
      { error: "Failed to update resident" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; residentId: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
    }

    const hostelId = params.id;
    const residentId = params.residentId;

    const hostel = await prisma.hostel.findFirst({
      where: { id: hostelId, tenantId: session.user.tenantId! },
    });
    if (!hostel) {
      return NextResponse.json({ error: "The requested item was not found" }, { status: 404 });
    }

    const resident = await prisma.resident.findFirst({
      where: { id: residentId, hostelId },
    });
    if (!resident) {
      return NextResponse.json({ error: "Resident not found" }, { status: 404 });
    }

    // Checkout instead of hard delete
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.resident.update({
        where: { id: residentId },
        data: { status: "CHECKED_OUT", moveOutDate: new Date() },
      });

      await tx.bed.update({
        where: { id: resident.bedId },
        data: { status: "VACANT" },
      });

      // Revoke portal access on checkout
      await tx.user.update({
        where: { id: resident.userId },
        data: { isActive: false },
      });

      return updated;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("DELETE resident error:", error);
    return NextResponse.json(
      { error: "Failed to checkout resident" },
      { status: 500 }
    );
  }
}
