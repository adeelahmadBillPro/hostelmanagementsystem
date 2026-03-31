import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { roomSchema } from "@/lib/validations";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Please login to continue" }, { status: 401 });

    const hostelId = params.id;
    const hostel = await prisma.hostel.findFirst({
      where: { id: hostelId, tenantId: session.user.tenantId! },
    });
    if (!hostel) return NextResponse.json({ error: "The requested item was not found" }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const buildingId = searchParams.get("buildingId");
    const floorId = searchParams.get("floorId");
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const includeMeterReadings = searchParams.get("include") === "meterReadings";

    const where: Prisma.RoomWhereInput = {
      floor: {
        building: { hostelId },
      },
    };

    if (floorId) {
      where.floorId = floorId;
    }
    if (buildingId) {
      where.floor = { ...where.floor as object, buildingId };
    }
    if (type) {
      where.type = type as any;
    }
    if (status) {
      where.status = status as any;
    }

    const rooms = await prisma.room.findMany({
      where,
      include: {
        beds: true,
        floor: {
          include: {
            building: { select: { id: true, name: true } },
          },
        },
        ...(includeMeterReadings && {
          meterReadings: {
            orderBy: { readingDate: "desc" as const },
            take: 1,
          },
        }),
      },
      orderBy: [
        { floor: { building: { name: "asc" } } },
        { floor: { floorNumber: "asc" } },
        { roomNumber: "asc" },
      ],
    });

    // Compute stats
    const totalRooms = rooms.length;
    const totalBeds = rooms.reduce((sum, r) => sum + r.beds.length, 0);
    const occupiedBeds = rooms.reduce(
      (sum, r) => sum + r.beds.filter((b) => b.status === "OCCUPIED").length,
      0
    );
    const vacantBeds = rooms.reduce(
      (sum, r) => sum + r.beds.filter((b) => b.status === "VACANT").length,
      0
    );
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
    const revenuePotential = rooms.reduce((sum, r) => sum + r.rentPerBed * r.totalBeds, 0);

    const roomsData = rooms.map((room) => {
      const occupied = room.beds.filter((b) => b.status === "OCCUPIED").length;
      const vacant = room.beds.filter((b) => b.status === "VACANT").length;
      const total = room.beds.length;

      let occupancyStatus: string;
      if (room.status === "MAINTENANCE") {
        occupancyStatus = "maintenance";
      } else if (occupied === 0) {
        occupancyStatus = "vacant";
      } else if (occupied < total) {
        occupancyStatus = "partial";
      } else {
        occupancyStatus = "full";
      }

      return {
        id: room.id,
        roomNumber: room.roomNumber,
        type: room.type,
        totalBeds: room.totalBeds,
        rentPerBed: room.rentPerBed,
        rentPerRoom: room.rentPerRoom,
        status: room.status,
        floorId: room.floorId,
        floor: room.floor,
        beds: room.beds.map((b) => ({
          id: b.id,
          bedNumber: b.bedNumber,
          status: b.status,
        })),
        occupiedBeds: occupied,
        vacantBeds: vacant,
        occupancyStatus,
        meterReadings: includeMeterReadings ? ((room as any).meterReadings || []) : undefined,
      };
    });

    // Also return buildings and floors for filters
    const buildings = await prisma.building.findMany({
      where: { hostelId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    const floors = await prisma.floor.findMany({
      where: { building: { hostelId } },
      select: { id: true, name: true, floorNumber: true, buildingId: true },
      orderBy: [{ building: { name: "asc" } }, { floorNumber: "asc" }],
    });

    return NextResponse.json({
      rooms: roomsData,
      buildings,
      floors,
      stats: {
        totalRooms,
        totalBeds,
        occupiedBeds,
        vacantBeds,
        occupancyRate,
        revenuePotential,
      },
    });
  } catch (error) {
    console.error("GET rooms error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const limited = rateLimit(request, "standard");
  if (limited) return limited;

  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Please login to continue" }, { status: 401 });

    const hostelId = params.id;
    const hostel = await prisma.hostel.findFirst({
      where: { id: hostelId, tenantId: session.user.tenantId! },
    });
    if (!hostel) return NextResponse.json({ error: "The requested item was not found" }, { status: 404 });

    const body = await request.json();
    // Check plan limits
    const { canAddRooms } = require("@/lib/plan-limits");
    const roomCount = Number(body.roomCount) || 1;
    const roomLimit = await canAddRooms(session.user.tenantId!, hostelId, roomCount);
    if (!roomLimit.allowed) {
      return NextResponse.json({ error: roomLimit.reason }, { status: 403 });
    }

    // Convert string numbers from form to actual numbers
    const parsed = roomSchema.safeParse({
      ...body,
      totalBeds: Number(body.totalBeds) || 0,
      rentPerBed: Number(body.rentPerBed) || 0,
      rentPerRoom: body.rentPerRoom ? Number(body.rentPerRoom) : undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { floorId, roomNumber, type, totalBeds, rentPerBed, rentPerRoom } = parsed.data;
    const { dailyRate, nightlyRate, weeklyRate } = body;

    // Verify floor belongs to this hostel
    const floor = await prisma.floor.findFirst({
      where: {
        id: floorId,
        building: { hostelId },
      },
    });
    if (!floor) {
      return NextResponse.json({ error: "Floor not found" }, { status: 404 });
    }

    // Check duplicate room number in same floor
    const existing = await prisma.room.findFirst({
      where: { floorId, roomNumber },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A room with this number already exists on this floor" },
        { status: 400 }
      );
    }

    const room = await prisma.room.create({
      data: {
        roomNumber,
        type,
        totalBeds,
        rentPerBed,
        rentPerRoom: rentPerRoom ?? null,
        dailyRate: dailyRate ? parseFloat(dailyRate) : null,
        nightlyRate: nightlyRate ? parseFloat(nightlyRate) : null,
        weeklyRate: weeklyRate ? parseFloat(weeklyRate) : null,
        floorId,
      },
    });

    // Automatically create beds
    for (let i = 1; i <= totalBeds; i++) {
      await prisma.bed.create({
        data: {
          bedNumber: `${roomNumber}-B${i}`,
          roomId: room.id,
        },
      });
    }

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error("POST room error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
