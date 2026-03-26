import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; roomId: string } }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const hostelId = params.id;
    const hostel = await prisma.hostel.findFirst({
      where: { id: hostelId, tenantId: session.user.tenantId! },
    });
    if (!hostel) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const room = await prisma.room.findFirst({
      where: {
        id: params.roomId,
        floor: {
          building: { hostelId },
        },
      },
      include: {
        floor: {
          include: {
            building: { select: { id: true, name: true } },
          },
        },
        beds: {
          include: {
            residents: {
              where: { status: "ACTIVE" },
              include: {
                user: {
                  select: { id: true, name: true, phone: true, email: true },
                },
              },
            },
          },
          orderBy: { bedNumber: "asc" },
        },
        roomInventory: {
          orderBy: { itemName: "asc" },
        },
        residents: {
          include: {
            user: {
              select: { id: true, name: true, phone: true },
            },
            bed: { select: { id: true, bedNumber: true } },
          },
          orderBy: { moveInDate: "desc" },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Separate active and past residents
    const activeResidents = room.residents.filter((r) => r.status === "ACTIVE");
    const pastResidents = room.residents.filter((r) => r.status !== "ACTIVE");

    const bedsData = room.beds.map((bed) => {
      const activeResident = bed.residents.length > 0 ? bed.residents[0] : null;
      return {
        id: bed.id,
        bedNumber: bed.bedNumber,
        status: bed.status,
        resident: activeResident
          ? {
              id: activeResident.id,
              name: activeResident.user.name,
              phone: activeResident.user.phone,
              moveInDate: activeResident.moveInDate,
            }
          : null,
      };
    });

    return NextResponse.json({
      room: {
        id: room.id,
        roomNumber: room.roomNumber,
        type: room.type,
        totalBeds: room.totalBeds,
        rentPerBed: room.rentPerBed,
        rentPerRoom: room.rentPerRoom,
        status: room.status,
        floor: room.floor,
        createdAt: room.createdAt,
      },
      beds: bedsData,
      inventory: room.roomInventory,
      activeResidents: activeResidents.map((r) => ({
        id: r.id,
        name: r.user.name,
        phone: r.user.phone,
        bedNumber: r.bed.bedNumber,
        moveInDate: r.moveInDate,
      })),
      pastResidents: pastResidents.map((r) => ({
        id: r.id,
        name: r.user.name,
        phone: r.user.phone,
        bedNumber: r.bed.bedNumber,
        moveInDate: r.moveInDate,
        moveOutDate: r.moveOutDate,
        status: r.status,
      })),
    });
  } catch (error) {
    console.error("GET room detail error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; roomId: string } }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const hostelId = params.id;
    const hostel = await prisma.hostel.findFirst({
      where: { id: hostelId, tenantId: session.user.tenantId! },
    });
    if (!hostel) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const room = await prisma.room.findFirst({
      where: {
        id: params.roomId,
        floor: { building: { hostelId } },
      },
    });
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const body = await request.json();
    const { roomNumber, type, rentPerBed, rentPerRoom, status } = body;

    const updated = await prisma.room.update({
      where: { id: params.roomId },
      data: {
        ...(roomNumber && { roomNumber }),
        ...(type && { type }),
        ...(rentPerBed !== undefined && { rentPerBed: parseFloat(rentPerBed) }),
        ...(rentPerRoom !== undefined && { rentPerRoom: rentPerRoom ? parseFloat(rentPerRoom) : null }),
        ...(status && { status }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH room error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; roomId: string } }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const hostelId = params.id;
    const hostel = await prisma.hostel.findFirst({
      where: { id: hostelId, tenantId: session.user.tenantId! },
    });
    if (!hostel) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const room = await prisma.room.findFirst({
      where: {
        id: params.roomId,
        floor: { building: { hostelId } },
      },
    });
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    // Check for active residents
    const activeResidents = await prisma.resident.count({
      where: { roomId: params.roomId, status: "ACTIVE" },
    });

    if (activeResidents > 0) {
      return NextResponse.json(
        { error: "Cannot delete room with active residents. Please check them out first." },
        { status: 400 }
      );
    }

    await prisma.room.delete({ where: { id: params.roomId } });

    return NextResponse.json({ message: "Room deleted successfully" });
  } catch (error) {
    console.error("DELETE room error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
