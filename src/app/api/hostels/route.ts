import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { hostelSchema } from "@/lib/validations";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
  }

  const tenantId = session.user.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Your account is not linked to any organization. Please contact support." }, { status: 403 });
  }

  try {
    let hostelFilter: any = { tenantId };

    // Managers only see their assigned hostels
    if (session.user.role === "HOSTEL_MANAGER") {
      const managerHostels = await prisma.managerHostel.findMany({
        where: { userId: session.user.id },
        select: { hostelId: true },
      });
      const hostelIds = managerHostels.map((mh) => mh.hostelId);
      hostelFilter = { tenantId, id: { in: hostelIds } };
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const hostels = await prisma.hostel.findMany({
      where: hostelFilter,
      orderBy: { createdAt: "desc" },
      include: {
        buildings: {
          include: {
            floors: {
              include: {
                rooms: {
                  include: {
                    beds: true,
                  },
                },
              },
            },
          },
        },
        residents: {
          where: { status: "ACTIVE" },
          select: { id: true },
        },
        monthlyBills: {
          where: { month: currentMonth, year: currentYear },
          select: { paidAmount: true },
        },
      },
    });

    const result = hostels.map((hostel) => {
      let totalRooms = 0;
      let totalBeds = 0;
      let occupiedBeds = 0;

      hostel.buildings.forEach((building) => {
        building.floors.forEach((floor) => {
          floor.rooms.forEach((room) => {
            totalRooms++;
            room.beds.forEach((bed) => {
              totalBeds++;
              if (bed.status === "OCCUPIED") {
                occupiedBeds++;
              }
            });
          });
        });
      });

      const monthlyRevenue = hostel.monthlyBills.reduce(
        (sum, bill) => sum + bill.paidAmount,
        0
      );

      return {
        id: hostel.id,
        name: hostel.name,
        type: hostel.type,
        address: hostel.address,
        city: hostel.city,
        contact: hostel.contact,
        status: hostel.status,
        createdAt: hostel.createdAt,
        totalRooms,
        totalBeds,
        occupiedBeds,
        vacantBeds: totalBeds - occupiedBeds,
        activeResidents: hostel.residents.length,
        monthlyRevenue,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Fetch hostels error:", error);
    return NextResponse.json(
      { error: "Failed to fetch hostels" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "standard");
  if (limited) return limited;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
  }

  const tenantId = session.user.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Your account is not linked to any organization. Please contact support." }, { status: 403 });
  }

  // Only tenant admins can create hostels
  if (session.user.role !== "TENANT_ADMIN") {
    return NextResponse.json({ error: "Only hostel owners can create new hostels. Please login as Tenant Admin." }, { status: 403 });
  }

  try {
    // Check plan limits
    const { canAddHostel } = require("@/lib/plan-limits");
    const limitCheck = await canAddHostel(tenantId);
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.reason }, { status: 403 });
    }

    const body = await request.json();
    const parsed = hostelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { name, type, address, city, contact } = parsed.data;

    const hostel = await prisma.hostel.create({
      data: {
        name,
        type,
        address,
        city: city || null,
        contact: contact || null,
        tenantId,
      },
    });

    return NextResponse.json(hostel, { status: 201 });
  } catch (error) {
    console.error("Create hostel error:", error);
    return NextResponse.json(
      { error: "Failed to create hostel" },
      { status: 500 }
    );
  }
}
