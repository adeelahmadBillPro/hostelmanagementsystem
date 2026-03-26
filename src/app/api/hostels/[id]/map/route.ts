import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hostelId = params.id;

    // Verify hostel ownership via tenant
    const hostel = await prisma.hostel.findFirst({
      where: { id: hostelId, tenantId: session.user.tenantId! },
    });
    if (!hostel) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Fetch all buildings with floors, rooms, beds, and residents
    const buildings = await prisma.building.findMany({
      where: { hostelId },
      include: {
        floors: {
          include: {
            rooms: {
              include: {
                beds: {
                  include: {
                    residents: {
                      where: { status: "ACTIVE" },
                      include: {
                        user: {
                          select: {
                            id: true,
                            name: true,
                            phone: true,
                          },
                        },
                      },
                      take: 1,
                    },
                  },
                  orderBy: { bedNumber: "asc" },
                },
                roomInventory: {
                  select: {
                    itemName: true,
                    quantity: true,
                    condition: true,
                  },
                },
              },
              orderBy: { roomNumber: "asc" },
            },
          },
          orderBy: { floorNumber: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    // Aggregate stats
    let totalRooms = 0;
    let totalBeds = 0;
    let occupied = 0;
    let vacant = 0;
    let reserved = 0;

    const buildingsData = buildings.map((building) => ({
      id: building.id,
      name: building.name,
      totalFloors: building.totalFloors,
      floors: building.floors.map((floor) => ({
        id: floor.id,
        floorNumber: floor.floorNumber,
        name: floor.name,
        rooms: floor.rooms.map((room) => {
          const roomBeds = room.beds;
          const occupiedBeds = roomBeds.filter((b) => b.status === "OCCUPIED").length;
          const vacantBeds = roomBeds.filter((b) => b.status === "VACANT").length;
          const reservedBeds = roomBeds.filter((b) => b.status === "RESERVED").length;

          totalRooms++;
          totalBeds += roomBeds.length;
          occupied += occupiedBeds;
          vacant += vacantBeds;
          reserved += reservedBeds;

          // Compute room-level status
          let roomStatus: string;
          if (room.status === "MAINTENANCE") {
            roomStatus = "MAINTENANCE";
          } else if (occupiedBeds === 0 && reservedBeds === 0) {
            roomStatus = "VACANT";
          } else if (occupiedBeds < roomBeds.length) {
            roomStatus = "PARTIAL";
          } else {
            roomStatus = "FULL";
          }

          return {
            id: room.id,
            roomNumber: room.roomNumber,
            type: room.type,
            totalBeds: room.totalBeds,
            rentPerBed: room.rentPerBed,
            rentPerRoom: room.rentPerRoom,
            status: roomStatus,
            occupiedBeds,
            vacantBeds,
            beds: roomBeds.map((bed) => {
              const activeResident = bed.residents[0] || null;
              return {
                id: bed.id,
                bedNumber: bed.bedNumber,
                status: bed.status,
                resident: activeResident
                  ? {
                      id: activeResident.id,
                      name: activeResident.user.name,
                      phone: activeResident.user.phone || "",
                      moveInDate: activeResident.moveInDate.toISOString(),
                    }
                  : null,
              };
            }),
            // For FloorPlan residents array compatibility
            residents: roomBeds
              .filter((b) => b.residents[0])
              .map((b) => ({
                name: b.residents[0].user.name,
                bedNumber: b.bedNumber,
              })),
            // Inventory for room detail panel
            inventory: room.roomInventory.map((inv) => ({
              itemName: inv.itemName,
              quantity: inv.quantity,
              condition: inv.condition || "good",
            })),
            // Building/floor context for detail panel
            floor: floor.name,
            building: building.name,
            floorId: floor.id,
            buildingId: building.id,
          };
        }),
      })),
    }));

    const occupancyRate = totalBeds > 0 ? Math.round((occupied / totalBeds) * 100) : 0;

    return NextResponse.json({
      buildings: buildingsData,
      stats: {
        totalRooms,
        totalBeds,
        occupied,
        vacant,
        reserved,
        occupancyRate,
      },
    });
  } catch (error) {
    console.error("GET map data error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
