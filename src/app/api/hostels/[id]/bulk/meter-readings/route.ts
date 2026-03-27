import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant assigned" }, { status: 403 });
    }

    const hostel = await prisma.hostel.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!hostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    const { readings } = await request.json();

    if (!readings || !Array.isArray(readings) || readings.length === 0) {
      return NextResponse.json({ error: "readings array is required" }, { status: 400 });
    }

    let successCount = 0;
    const failed: { roomId: string; error: string }[] = [];

    for (const reading of readings) {
      try {
        const { roomId, previousReading, currentReading, ratePerUnit } = reading;

        if (!roomId || previousReading === undefined || currentReading === undefined || !ratePerUnit) {
          failed.push({ roomId: roomId || "unknown", error: "Missing required fields" });
          continue;
        }

        if (currentReading < previousReading) {
          failed.push({ roomId, error: "Current reading cannot be less than previous reading" });
          continue;
        }

        // Verify room belongs to this hostel
        const room = await prisma.room.findFirst({
          where: {
            id: roomId,
            floor: {
              building: { hostelId: params.id },
            },
          },
        });

        if (!room) {
          failed.push({ roomId, error: "Room not found in this hostel" });
          continue;
        }

        const units = currentReading - previousReading;
        const amount = units * ratePerUnit;

        await prisma.meterReading.create({
          data: {
            roomId,
            hostelId: params.id,
            previousReading,
            currentReading,
            units,
            ratePerUnit,
            amount,
            readingDate: new Date(),
          },
        });

        successCount++;
      } catch (err: any) {
        failed.push({ roomId: reading.roomId || "unknown", error: err.message || "Unknown error" });
      }
    }

    return NextResponse.json({
      success: successCount,
      failed,
      total: readings.length,
    });
  } catch (error: any) {
    console.error("Bulk meter readings error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
