import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.user.role !== "RESIDENT") {
      return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
    }

    const resident = await prisma.resident.findUnique({
      where: { userId: session.user.id },
      include: { hostel: true },
    });

    if (!resident) {
      return NextResponse.json({ error: "Resident not found" }, { status: 404 });
    }

    const hostel = await prisma.hostel.findUnique({
      where: { id: resident.hostelId },
      include: {
        _count: {
          select: { buildings: true, residents: true, staff: true },
        },
      },
    });

    const amenities = await prisma.hostelAmenity.findMany({
      where: { hostelId: resident.hostelId },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    // Group by category
    const grouped: Record<string, typeof amenities> = {};
    for (const a of amenities) {
      if (!grouped[a.category]) grouped[a.category] = [];
      grouped[a.category].push(a);
    }

    // Room counts
    const rooms = await prisma.room.count({
      where: { floor: { building: { hostelId: resident.hostelId } } },
    });
    const beds = await prisma.bed.count({
      where: { room: { floor: { building: { hostelId: resident.hostelId } } } },
    });

    const totalAmenities = amenities.length;
    const availableCount = amenities.filter((a) => a.isAvailable).length;

    return NextResponse.json({
      hostel: {
        id: hostel?.id,
        name: hostel?.name,
        type: hostel?.type,
        address: hostel?.address,
        city: hostel?.city,
        contact: hostel?.contact,
        description: hostel?.description,
        coverImage: hostel?.coverImage,
        buildings: hostel?._count.buildings || 0,
        residents: hostel?._count.residents || 0,
        staff: hostel?._count.staff || 0,
        rooms,
        beds,
      },
      amenities: grouped,
      stats: { total: totalAmenities, available: availableCount },
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
