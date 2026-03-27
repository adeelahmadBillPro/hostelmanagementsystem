import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const limited = rateLimit(request, "sensitive");
  if (limited) return limited;

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
    }

    const hostelId = params.id;
    const hostel = await prisma.hostel.findFirst({
      where: { id: hostelId, tenantId: session.user.tenantId! },
    });
    if (!hostel) {
      return NextResponse.json({ error: "The requested item was not found" }, { status: 404 });
    }

    const body = await request.json();
    const { floorId, startNumber, count, type, rentPerBed, rentPerRoom } = body;

    if (!floorId || !startNumber || !count || !type || !rentPerBed) {
      return NextResponse.json(
        { error: "Please fill all required fields" },
        { status: 400 }
      );
    }

    const numCount = Number(count);
    const numStart = Number(startNumber);
    const numRent = Number(rentPerBed);
    const numRentRoom = rentPerRoom ? Number(rentPerRoom) : null;

    if (numCount < 1 || numCount > 50) {
      return NextResponse.json(
        { error: "You can create 1 to 50 rooms at a time" },
        { status: 400 }
      );
    }

    // Verify floor belongs to this hostel
    const floor = await prisma.floor.findFirst({
      where: { id: floorId, building: { hostelId } },
    });
    if (!floor) {
      return NextResponse.json(
        { error: "Selected floor was not found" },
        { status: 404 }
      );
    }

    // Get beds count from type
    const bedsMap: Record<string, number> = {
      SINGLE: 1,
      DOUBLE: 2,
      TRIPLE: 3,
      QUAD: 4,
    };
    const totalBeds = bedsMap[type] || 2;

    // Create rooms in transaction
    const results = await prisma.$transaction(async (tx) => {
      const created = [];
      const failed = [];

      for (let i = 0; i < numCount; i++) {
        const roomNumber = String(numStart + i);

        // Check if room number already exists on this floor
        const existing = await tx.room.findFirst({
          where: { floorId, roomNumber },
        });
        if (existing) {
          failed.push({ roomNumber, error: "Room number already exists" });
          continue;
        }

        // Create room
        const room = await tx.room.create({
          data: {
            roomNumber,
            type: type as any,
            totalBeds,
            rentPerBed: numRent,
            rentPerRoom: numRentRoom,
            floorId,
          },
        });

        // Create beds
        for (let b = 1; b <= totalBeds; b++) {
          await tx.bed.create({
            data: {
              bedNumber: `${roomNumber}-B${b}`,
              roomId: room.id,
            },
          });
        }

        created.push({
          id: room.id,
          roomNumber,
          type,
          totalBeds,
          rentPerBed: numRent,
        });
      }

      return { created, failed };
    });

    return NextResponse.json({
      success: true,
      message: `Created ${results.created.length} rooms with ${results.created.length * (bedsMap[type] || 2)} beds`,
      created: results.created.length,
      failed: results.failed.length,
      failedDetails: results.failed,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
