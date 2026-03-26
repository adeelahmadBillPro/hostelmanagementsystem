import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; buildingId: string } }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const hostelId = params.id;
    const hostel = await prisma.hostel.findFirst({
      where: { id: hostelId, tenantId: session.user.tenantId! },
    });
    if (!hostel) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const building = await prisma.building.findFirst({
      where: { id: params.buildingId, hostelId },
    });
    if (!building) return NextResponse.json({ error: "Building not found" }, { status: 404 });

    const body = await request.json();
    const { name, totalFloors } = body;

    const updated = await prisma.building.update({
      where: { id: params.buildingId },
      data: {
        ...(name && { name }),
        ...(totalFloors && { totalFloors: parseInt(totalFloors) }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH building error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; buildingId: string } }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const hostelId = params.id;
    const hostel = await prisma.hostel.findFirst({
      where: { id: hostelId, tenantId: session.user.tenantId! },
    });
    if (!hostel) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const building = await prisma.building.findFirst({
      where: { id: params.buildingId, hostelId },
    });
    if (!building) return NextResponse.json({ error: "Building not found" }, { status: 404 });

    // Check if building has any occupied beds
    const occupiedBeds = await prisma.bed.count({
      where: {
        status: "OCCUPIED",
        room: {
          floor: {
            buildingId: params.buildingId,
          },
        },
      },
    });

    if (occupiedBeds > 0) {
      return NextResponse.json(
        { error: "Cannot delete building with occupied beds. Please relocate residents first." },
        { status: 400 }
      );
    }

    await prisma.building.delete({ where: { id: params.buildingId } });

    return NextResponse.json({ message: "Building deleted successfully" });
  } catch (error) {
    console.error("DELETE building error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
