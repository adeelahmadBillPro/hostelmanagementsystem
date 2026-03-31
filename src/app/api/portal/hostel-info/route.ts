import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.user.role !== "RESIDENT" && session.user.role !== "STAFF")) {
      return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
    }

    let hostelId: string | null = null;

    if (session.user.role === "STAFF") {
      hostelId = session.user.hostelId || null;
    } else {
      const resident = await prisma.resident.findUnique({
        where: { userId: session.user.id },
      });
      if (!resident) {
        return NextResponse.json({ error: "Resident not found" }, { status: 404 });
      }
      hostelId = resident.hostelId;
    }

    if (!hostelId) {
      return NextResponse.json({ error: "Not assigned to a hostel" }, { status: 404 });
    }

    const hostel = await prisma.hostel.findUnique({
      where: { id: hostelId },
      include: {
        _count: {
          select: { buildings: true, residents: true, staff: true },
        },
      },
    });

    if (!hostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    const amenities = await prisma.hostelAmenity.findMany({
      where: { hostelId },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    // Group by category
    const grouped: Record<string, typeof amenities> = {};
    for (const a of amenities) {
      if (!grouped[a.category]) grouped[a.category] = [];
      grouped[a.category].push(a);
    }

    // Room/bed counts
    const rooms = await prisma.room.count({
      where: { floor: { building: { hostelId } } },
    });
    const beds = await prisma.bed.count({
      where: { room: { floor: { building: { hostelId } } } },
    });

    const totalAmenities = amenities.length;
    const availableCount = amenities.filter((a) => a.isAvailable).length;

    return NextResponse.json({
      hostel: {
        id: hostel.id,
        name: hostel.name,
        type: hostel.type,
        address: hostel.address,
        city: hostel.city,
        contact: hostel.contact,
        description: hostel.description,
        coverImage: hostel.coverImage,
        buildings: hostel._count.buildings || 0,
        residents: hostel._count.residents || 0,
        staff: hostel._count.staff || 0,
        rooms,
        beds,
      },
      amenities: grouped,
      stats: { total: totalAmenities, available: availableCount },
    });
  } catch (error) {
    console.error("Failed to fetch hostel info:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
