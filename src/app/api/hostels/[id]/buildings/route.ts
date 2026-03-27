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

    const buildings = await prisma.building.findMany({
      where: { hostelId },
      include: {
        floors: {
          include: {
            rooms: {
              include: {
                beds: true,
              },
            },
          },
          orderBy: { floorNumber: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    // Compute stats
    let totalFloors = 0;
    let totalRooms = 0;
    let totalBeds = 0;
    let occupiedBeds = 0;

    const buildingsWithStats = buildings.map((building) => {
      let buildingRooms = 0;
      let buildingBeds = 0;
      let buildingOccupied = 0;

      const floorsWithStats = building.floors.map((floor) => {
        const floorRooms = floor.rooms.length;
        const floorBeds = floor.rooms.reduce((sum, r) => sum + r.beds.length, 0);
        const floorOccupied = floor.rooms.reduce(
          (sum, r) => sum + r.beds.filter((b) => b.status === "OCCUPIED").length,
          0
        );

        buildingRooms += floorRooms;
        buildingBeds += floorBeds;
        buildingOccupied += floorOccupied;

        return {
          id: floor.id,
          floorNumber: floor.floorNumber,
          name: floor.name,
          buildingId: floor.buildingId,
          roomCount: floorRooms,
          bedCount: floorBeds,
          occupiedBeds: floorOccupied,
        };
      });

      totalFloors += building.floors.length;
      totalRooms += buildingRooms;
      totalBeds += buildingBeds;
      occupiedBeds += buildingOccupied;

      return {
        id: building.id,
        name: building.name,
        totalFloors: building.totalFloors,
        hostelId: building.hostelId,
        createdAt: building.createdAt,
        floors: floorsWithStats,
        roomCount: buildingRooms,
        bedCount: buildingBeds,
        occupiedBeds: buildingOccupied,
      };
    });

    const vacancyRate = totalBeds > 0 ? Math.round(((totalBeds - occupiedBeds) / totalBeds) * 100) : 0;

    return NextResponse.json({
      buildings: buildingsWithStats,
      stats: {
        totalBuildings: buildings.length,
        totalFloors,
        totalRooms,
        totalBeds,
        occupiedBeds,
        vacancyRate,
      },
    });
  } catch (error) {
    console.error("GET buildings error:", error);
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
    const { name, totalFloors } = body;

    if (!name || !totalFloors) {
      return NextResponse.json({ error: "Name and total floors are required" }, { status: 400 });
    }

    const building = await prisma.building.create({
      data: {
        name,
        totalFloors: parseInt(totalFloors),
        hostelId,
      },
    });

    return NextResponse.json(building, { status: 201 });
  } catch (error) {
    console.error("POST building error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
