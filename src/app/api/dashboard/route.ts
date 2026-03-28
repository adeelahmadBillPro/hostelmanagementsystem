import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

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
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // For managers, only show their assigned hostels
    let hostelFilter: any = { tenantId };
    if (session.user.role === "HOSTEL_MANAGER") {
      const managerHostels = await prisma.managerHostel.findMany({
        where: { userId: session.user.id },
        select: { hostelId: true },
      });
      const hostelIds = managerHostels.map((mh) => mh.hostelId);
      hostelFilter = { tenantId, id: { in: hostelIds } };
    }

    // Fetch hostels with nested counts
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
          select: { totalAmount: true, paidAmount: true, balance: true, status: true },
        },
      },
    });

    // Compute stats per hostel
    const hostelStats = hostels.map((hostel) => {
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

      const vacantBeds = totalBeds - occupiedBeds;
      const monthlyRevenue = hostel.monthlyBills.reduce(
        (sum, bill) => sum + bill.paidAmount,
        0
      );
      const pendingAmount = hostel.monthlyBills.reduce(
        (sum, bill) => sum + bill.balance,
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
        totalRooms,
        totalBeds,
        occupiedBeds,
        vacantBeds,
        activeResidents: hostel.residents.length,
        monthlyRevenue,
        pendingAmount,
      };
    });

    // Aggregate totals
    const totalHostels = hostelStats.length;
    const totalResidents = hostelStats.reduce(
      (sum, h) => sum + h.activeResidents,
      0
    );
    const monthlyRevenue = hostelStats.reduce(
      (sum, h) => sum + h.monthlyRevenue,
      0
    );
    const pendingPayments = hostelStats.reduce(
      (sum, h) => sum + h.pendingAmount,
      0
    );

    // Food plan breakdown
    const hostelIds = hostels.map(h => h.id);
    const messCounts = await prisma.resident.groupBy({
      by: ["foodPlan"],
      where: { hostelId: { in: hostelIds }, status: "ACTIVE" },
      _count: true,
    });
    const foodPlanStats: Record<string, number> = { FULL_MESS: 0, NO_MESS: 0, CUSTOM: 0 };
    messCounts.forEach((m: any) => { foodPlanStats[m.foodPlan] = m._count; });

    // Staff breakdown
    const staffCounts = await prisma.staff.groupBy({
      by: ["staffType"],
      where: { hostelId: { in: hostelIds }, isActive: true },
      _count: true,
    });
    const staffStats: Record<string, number> = {};
    let totalStaff = 0;
    staffCounts.forEach((s: any) => { staffStats[s.staffType] = s._count; totalStaff += s._count; });

    return NextResponse.json({
      stats: {
        totalHostels,
        totalResidents,
        monthlyRevenue,
        pendingPayments,
      },
      foodPlanStats,
      staffStats: { total: totalStaff, byType: staffStats },
      hostels: hostelStats,
    });
  } catch (error) {
    console.error("Dashboard data error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
