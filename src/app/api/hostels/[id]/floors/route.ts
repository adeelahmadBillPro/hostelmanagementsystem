import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

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

    const where: any = {
      building: { hostelId },
    };
    if (buildingId) {
      where.buildingId = buildingId;
    }

    const floors = await prisma.floor.findMany({
      where,
      include: {
        building: { select: { id: true, name: true } },
        rooms: {
          include: {
            beds: true,
          },
        },
      },
      orderBy: [
        { building: { name: "asc" } },
        { floorNumber: "asc" },
      ],
    });

    const floorsWithStats = floors.map((floor) => {
      const roomCount = floor.rooms.length;
      const bedCount = floor.rooms.reduce((sum, r) => sum + r.beds.length, 0);
      const occupiedBeds = floor.rooms.reduce(
        (sum, r) => sum + r.beds.filter((b) => b.status === "OCCUPIED").length,
        0
      );
      const vacantBeds = floor.rooms.reduce(
        (sum, r) => sum + r.beds.filter((b) => b.status === "VACANT").length,
        0
      );

      return {
        id: floor.id,
        floorNumber: floor.floorNumber,
        name: floor.name,
        buildingId: floor.buildingId,
        building: floor.building,
        createdAt: floor.createdAt,
        roomCount,
        bedCount,
        occupiedBeds,
        vacantBeds,
      };
    });

    // Also return buildings for the dropdown
    const buildings = await prisma.building.findMany({
      where: { hostelId },
      select: { id: true, name: true, totalFloors: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ floors: floorsWithStats, buildings });
  } catch (error) {
    console.error("GET floors error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
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

    const body = await request.json();
    const { buildingId, floorNumber, name } = body;

    if (!buildingId || floorNumber === undefined || !name) {
      return NextResponse.json(
        { error: "Building, floor number, and name are required" },
        { status: 400 }
      );
    }

    // Verify building belongs to this hostel
    const building = await prisma.building.findFirst({
      where: { id: buildingId, hostelId },
    });
    if (!building) {
      return NextResponse.json({ error: "Building not found" }, { status: 404 });
    }

    // Check duplicate floor number in same building
    const existing = await prisma.floor.findFirst({
      where: { buildingId, floorNumber: parseInt(floorNumber) },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A floor with this number already exists in this building" },
        { status: 400 }
      );
    }

    const floor = await prisma.floor.create({
      data: {
        floorNumber: parseInt(floorNumber),
        name,
        buildingId,
      },
      include: {
        building: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(floor, { status: 201 });
  } catch (error) {
    console.error("POST floor error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
