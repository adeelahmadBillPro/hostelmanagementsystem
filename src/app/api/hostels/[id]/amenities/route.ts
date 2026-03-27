import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// Default amenities grouped by category
const DEFAULT_AMENITIES: { name: string; category: string; icon: string }[] = [
  // Hostel General
  { name: "Wi-Fi / Internet", category: "hostel", icon: "wifi" },
  { name: "Generator / UPS Backup", category: "hostel", icon: "zap" },
  { name: "Laundry Service", category: "hostel", icon: "shirt" },
  { name: "Iron / Ironing Board", category: "hostel", icon: "flame" },
  { name: "Common Room / TV Lounge", category: "hostel", icon: "tv" },
  { name: "Library / Study Room", category: "hostel", icon: "book-open" },
  { name: "Prayer Room", category: "hostel", icon: "heart" },
  { name: "Gym / Exercise Area", category: "hostel", icon: "dumbbell" },
  { name: "Garden / Lawn", category: "hostel", icon: "trees" },
  { name: "Terrace / Rooftop", category: "hostel", icon: "sun" },
  { name: "Elevator / Lift", category: "hostel", icon: "arrow-up-down" },
  { name: "Wheelchair Accessible", category: "hostel", icon: "accessibility" },

  // Room Facilities
  { name: "Attached Washroom", category: "room", icon: "bath" },
  { name: "Air Conditioning (AC)", category: "room", icon: "snowflake" },
  { name: "Ceiling Fan", category: "room", icon: "fan" },
  { name: "Room Heater (Winter)", category: "room", icon: "thermometer" },
  { name: "Cupboard / Wardrobe", category: "room", icon: "archive" },
  { name: "Study Table & Chair", category: "room", icon: "lamp-desk" },
  { name: "Mattress Provided", category: "room", icon: "bed-double" },
  { name: "Pillow & Bed Sheet", category: "room", icon: "pillow" },
  { name: "Curtains", category: "room", icon: "panel-left" },
  { name: "Mirror", category: "room", icon: "scan" },
  { name: "Power Sockets (Multiple)", category: "room", icon: "plug" },
  { name: "Balcony", category: "room", icon: "door-open" },

  // Washroom
  { name: "Western Toilet", category: "washroom", icon: "droplets" },
  { name: "Eastern Toilet", category: "washroom", icon: "droplets" },
  { name: "Hot Water (Geyser)", category: "washroom", icon: "flame" },
  { name: "Shower", category: "washroom", icon: "shower-head" },
  { name: "Exhaust Fan", category: "washroom", icon: "fan" },
  { name: "Tiles / Clean Floor", category: "washroom", icon: "square" },

  // Dining
  { name: "Mess / Kitchen", category: "dining", icon: "utensils-crossed" },
  { name: "Dining Hall", category: "dining", icon: "utensils" },
  { name: "Water Filter / RO", category: "dining", icon: "glass-water" },
  { name: "Microwave Available", category: "dining", icon: "microwave" },
  { name: "Fridge / Refrigerator", category: "dining", icon: "refrigerator" },
  { name: "Gas Stove (Self Cook)", category: "dining", icon: "flame" },
  { name: "Breakfast Included", category: "dining", icon: "coffee" },
  { name: "Lunch Included", category: "dining", icon: "sun" },
  { name: "Dinner Included", category: "dining", icon: "moon" },

  // Security
  { name: "CCTV Cameras", category: "security", icon: "camera" },
  { name: "24/7 Security Guard", category: "security", icon: "shield" },
  { name: "Biometric / Card Entry", category: "security", icon: "fingerprint" },
  { name: "Fire Extinguisher", category: "security", icon: "flame" },
  { name: "First Aid Kit", category: "security", icon: "heart-pulse" },
  { name: "Emergency Exit", category: "security", icon: "door-open" },
  { name: "Night Watchman", category: "security", icon: "eye" },
  { name: "Visitor Register", category: "security", icon: "clipboard-list" },

  // Transport & Location
  { name: "Parking (Bike)", category: "transport", icon: "bike" },
  { name: "Parking (Car)", category: "transport", icon: "car" },
  { name: "Near Bus Stop", category: "transport", icon: "bus" },
  { name: "Near Train Station", category: "transport", icon: "train" },
  { name: "Near University", category: "transport", icon: "graduation-cap" },
  { name: "Near Hospital", category: "transport", icon: "hospital" },
  { name: "Near Market / Shop", category: "transport", icon: "shopping-bag" },
  { name: "Near Mosque / Temple", category: "transport", icon: "landmark" },
  { name: "Near ATM / Bank", category: "transport", icon: "banknote" },
  { name: "Near Park", category: "transport", icon: "trees" },
];

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hostelId = params.id;

    // Check if amenities exist for this hostel
    let amenities = await prisma.hostelAmenity.findMany({
      where: { hostelId },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    // If no amenities, seed defaults
    if (amenities.length === 0) {
      await prisma.hostelAmenity.createMany({
        data: DEFAULT_AMENITIES.map((a) => ({
          ...a,
          hostelId,
          isAvailable: false,
        })),
      });

      amenities = await prisma.hostelAmenity.findMany({
        where: { hostelId },
        orderBy: [{ category: "asc" }, { name: "asc" }],
      });
    }

    // Group by category
    const grouped: Record<string, typeof amenities> = {};
    for (const a of amenities) {
      if (!grouped[a.category]) grouped[a.category] = [];
      grouped[a.category].push(a);
    }

    const hostel = await prisma.hostel.findUnique({
      where: { id: hostelId },
      select: { id: true, name: true, type: true, address: true, city: true, contact: true, description: true, coverImage: true },
    });

    const totalAmenities = amenities.length;
    const availableCount = amenities.filter((a) => a.isAvailable).length;

    return NextResponse.json({
      hostel,
      amenities: grouped,
      stats: { total: totalAmenities, available: availableCount },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Add custom amenity
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, category, description, icon } = body;

    if (!name || !category) {
      return NextResponse.json({ error: "Name and category required" }, { status: 400 });
    }

    const amenity = await prisma.hostelAmenity.create({
      data: {
        name,
        category,
        description,
        icon: icon || null,
        isAvailable: true,
        hostelId: params.id,
      },
    });

    return NextResponse.json(amenity, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Bulk update amenities
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Update hostel description/coverImage
    if (body.description !== undefined || body.coverImage !== undefined) {
      await prisma.hostel.update({
        where: { id: params.id },
        data: {
          ...(body.description !== undefined && { description: body.description }),
          ...(body.coverImage !== undefined && { coverImage: body.coverImage }),
        },
      });
    }

    // Bulk toggle amenities
    if (body.updates && Array.isArray(body.updates)) {
      for (const update of body.updates) {
        await prisma.hostelAmenity.update({
          where: { id: update.id },
          data: { isAvailable: update.isAvailable },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove custom amenity
export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const amenityId = searchParams.get("id");

    if (!amenityId) {
      return NextResponse.json({ error: "Amenity ID required" }, { status: 400 });
    }

    await prisma.hostelAmenity.delete({ where: { id: amenityId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
