import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// GET: List all room transfers for this hostel
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

    const transfers = await prisma.roomTransfer.findMany({
      where: {
        resident: { hostelId },
      },
      include: {
        resident: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        fromRoom: {
          include: {
            floor: {
              include: { building: { select: { name: true } } },
            },
          },
        },
        fromBed: { select: { bedNumber: true } },
        toBed: {
          include: {
            room: {
              include: {
                floor: {
                  include: { building: { select: { name: true } } },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const formatted = transfers.map((t: any) => ({
      id: t.id,
      date: t.date,
      reason: t.reason,
      residentName: t.resident?.user?.name || "Unknown",
      fromRoom: `${t.fromRoom?.floor?.building?.name} - ${t.fromRoom?.roomNumber}`,
      fromBed: t.fromBed?.bedNumber || "N/A",
      toRoom: `${t.toBed?.room?.floor?.building?.name} - ${t.toBed?.room?.roomNumber}`,
      toBed: t.toBed?.bedNumber || "N/A",
    }));

    // Get active residents for transfer form
    const residents = await prisma.resident.findMany({
      where: { hostelId, status: "ACTIVE" },
      include: {
        user: { select: { name: true } },
        room: { select: { roomNumber: true } },
        bed: { select: { id: true, bedNumber: true } },
      },
    });

    // Get vacant beds
    const vacantBeds = await prisma.bed.findMany({
      where: {
        status: "VACANT",
        room: { floor: { building: { hostelId } } },
      },
      include: {
        room: {
          include: {
            floor: {
              include: { building: { select: { name: true } } },
            },
          },
        },
      },
    });

    return NextResponse.json({
      transfers: formatted,
      residents: residents.map((r: any) => ({
        id: r.id,
        name: r.user?.name,
        roomNumber: r.room?.roomNumber,
        bedId: r.bed?.id,
        bedNumber: r.bed?.bedNumber,
      })),
      vacantBeds: vacantBeds.map((b: any) => ({
        id: b.id,
        bedNumber: b.bedNumber,
        roomNumber: b.room?.roomNumber,
        floor: b.room?.floor?.name,
        building: b.room?.floor?.building?.name,
        label: `${b.room?.floor?.building?.name} → ${b.room?.roomNumber} → ${b.bedNumber}`,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Transfer a resident to a new bed
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { residentId, newBedId, reason } = body;

    if (!residentId || !newBedId) {
      return NextResponse.json(
        { error: "Resident and new bed are required" },
        { status: 400 }
      );
    }

    // Get resident current assignment
    const resident = await prisma.resident.findUnique({
      where: { id: residentId },
      include: { bed: true, room: true },
    });

    if (!resident || resident.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Resident not found or not active" },
        { status: 404 }
      );
    }

    // Check new bed is vacant
    const newBed = await prisma.bed.findUnique({
      where: { id: newBedId },
      include: { room: true },
    });

    if (!newBed || newBed.status !== "VACANT") {
      return NextResponse.json(
        { error: "Selected bed is not available" },
        { status: 400 }
      );
    }

    // Perform transfer in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create transfer record
      const transfer = await tx.roomTransfer.create({
        data: {
          residentId,
          fromRoomId: resident.roomId,
          fromBedId: resident.bedId,
          toBedId: newBedId,
          reason: reason || null,
        },
      });

      // 2. Free old bed
      await tx.bed.update({
        where: { id: resident.bedId },
        data: { status: "VACANT" },
      });

      // 3. Assign new bed
      await tx.bed.update({
        where: { id: newBedId },
        data: { status: "OCCUPIED" },
      });

      // 4. Update resident's room and bed
      await tx.resident.update({
        where: { id: residentId },
        data: {
          roomId: newBed.roomId,
          bedId: newBedId,
        },
      });

      return transfer;
    });

    return NextResponse.json({
      success: true,
      transfer: result,
      message: `Resident transferred from ${resident.bed.bedNumber} to ${newBed.bedNumber}`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
