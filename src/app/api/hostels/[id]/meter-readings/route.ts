import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/**
 * GET /api/hostels/[id]/meter-readings
 * Returns all meter readings for a hostel, optionally filtered by roomId or date range.
 * Used by the meter-readings page to load existing readings per room.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: "Your account is not linked to any organization." },
        { status: 403 }
      );
    }

    const hostel = await prisma.hostel.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!hostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: any = { hostelId: params.id };
    if (roomId) where.roomId = roomId;
    if (from || to) {
      where.readingDate = {};
      if (from) where.readingDate.gte = new Date(from);
      if (to) where.readingDate.lte = new Date(to);
    }

    const readings = await prisma.meterReading.findMany({
      where,
      include: {
        room: {
          select: {
            roomNumber: true,
            floor: {
              select: {
                name: true,
                building: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: [{ roomId: "asc" }, { readingDate: "desc" }],
    });

    // Group latest reading per room for convenience
    const latestByRoom: Record<string, (typeof readings)[0]> = {};
    for (const r of readings) {
      if (!latestByRoom[r.roomId]) {
        latestByRoom[r.roomId] = r;
      }
    }

    const totalUnits = readings.reduce((sum, r) => sum + r.units, 0);
    const totalAmount = readings.reduce((sum, r) => sum + r.amount, 0);

    return NextResponse.json({
      readings,
      latestByRoom: Object.values(latestByRoom),
      stats: {
        totalReadings: readings.length,
        totalUnits,
        totalAmount,
      },
    });
  } catch (error) {
    console.error("GET meter-readings error:", error);
    return NextResponse.json({ error: "Failed to fetch meter readings" }, { status: 500 });
  }
}

/**
 * DELETE /api/hostels/[id]/meter-readings?readingId=xxx
 * Deletes a specific meter reading record.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || !session.user.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hostel = await prisma.hostel.findFirst({
      where: { id: params.id, tenantId: session.user.tenantId },
    });
    if (!hostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const readingId = searchParams.get("readingId");
    if (!readingId) {
      return NextResponse.json({ error: "readingId query param is required" }, { status: 400 });
    }

    const reading = await prisma.meterReading.findFirst({
      where: { id: readingId, hostelId: params.id },
    });
    if (!reading) {
      return NextResponse.json({ error: "Meter reading not found" }, { status: 404 });
    }

    await prisma.meterReading.delete({ where: { id: readingId } });

    return NextResponse.json({ message: "Meter reading deleted successfully" });
  } catch (error) {
    console.error("DELETE meter-reading error:", error);
    return NextResponse.json({ error: "Failed to delete meter reading" }, { status: 500 });
  }
}
