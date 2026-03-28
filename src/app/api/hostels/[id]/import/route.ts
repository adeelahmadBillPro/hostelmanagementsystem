import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { validateCNIC, validatePhone, validateEmail } from "@/lib/validate";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || !session.user.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hostelId = params.id;
    const hostel = await prisma.hostel.findFirst({
      where: { id: hostelId, tenantId: session.user.tenantId },
    });
    if (!hostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    const body = await request.json();
    const { type, rows } = body;

    if (!type || !rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "Type and rows are required" }, { status: 400 });
    }

    if (type === "residents") {
      return await importResidents(rows, hostelId, session.user.tenantId);
    }

    if (type === "rooms") {
      return await importRooms(rows, hostelId);
    }

    if (type === "food") {
      return await importFoodMenu(rows, hostelId);
    }

    return NextResponse.json({ error: "Invalid import type" }, { status: 400 });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}

// ── Import Residents ──
async function importResidents(rows: any[], hostelId: string, tenantId: string) {
  const results: { success: number; failed: { row: number; error: string }[]; credentials: { name: string; email: string; password: string }[] } = {
    success: 0,
    failed: [],
    credentials: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // Excel row (1-indexed + header)

    try {
      const { name, email, phone, cnic, roomNumber, bedNumber, advancePaid, securityDeposit, foodPlan } = row;

      // Validate required
      if (!name || !email || !roomNumber) {
        results.failed.push({ row: rowNum, error: "Name, email, and room number are required" });
        continue;
      }

      // Validate email
      const emailCheck = validateEmail(email);
      if (!emailCheck.valid) {
        results.failed.push({ row: rowNum, error: emailCheck.error || "Invalid email" });
        continue;
      }

      // Check email duplicate
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        results.failed.push({ row: rowNum, error: `Email ${email} already exists` });
        continue;
      }

      // Validate CNIC if provided
      if (cnic) {
        const cnicCheck = validateCNIC(cnic);
        if (!cnicCheck.valid) {
          results.failed.push({ row: rowNum, error: cnicCheck.error || "Invalid CNIC" });
          continue;
        }
      }

      // Find room by number
      const room = await prisma.room.findFirst({
        where: {
          roomNumber: String(roomNumber),
          floor: { building: { hostelId } },
        },
        include: { beds: true },
      });

      if (!room) {
        results.failed.push({ row: rowNum, error: `Room ${roomNumber} not found` });
        continue;
      }

      // Find vacant bed
      let bed;
      if (bedNumber) {
        bed = room.beds.find((b) => b.bedNumber === String(bedNumber) && b.status === "VACANT");
        if (!bed) {
          results.failed.push({ row: rowNum, error: `Bed ${bedNumber} not found or not vacant in room ${roomNumber}` });
          continue;
        }
      } else {
        bed = room.beds.find((b) => b.status === "VACANT");
        if (!bed) {
          results.failed.push({ row: rowNum, error: `No vacant bed in room ${roomNumber}` });
          continue;
        }
      }

      // Generate password
      const password = randomBytes(4).toString("hex");
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user + resident + update bed
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone ? String(phone).replace(/\D/g, "") : null,
            cnic: cnic ? String(cnic).replace(/\D/g, "") : null,
            password: hashedPassword,
            role: "RESIDENT",
            tenantId,
            hostelId,
          },
        });

        await tx.resident.create({
          data: {
            userId: user.id,
            hostelId,
            roomId: room.id,
            bedId: bed!.id,
            moveInDate: new Date(),
            advancePaid: parseFloat(advancePaid) || 0,
            securityDeposit: parseFloat(securityDeposit) || 0,
            foodPlan: foodPlan || "FULL_MESS",
            status: "ACTIVE",
          },
        });

        await tx.bed.update({
          where: { id: bed!.id },
          data: { status: "OCCUPIED" },
        });
      });

      results.success++;
      results.credentials.push({ name: name.trim(), email: email.trim(), password });
    } catch (err: any) {
      results.failed.push({ row: rowNum, error: err.message || "Unknown error" });
    }
  }

  return NextResponse.json({
    message: `Imported ${results.success} residents. ${results.failed.length} failed.`,
    ...results,
  });
}

// ── Import Rooms ──
async function importRooms(rows: any[], hostelId: string) {
  const results = { success: 0, failed: [] as { row: number; error: string }[] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      const { buildingName, floorName, floorNumber, roomNumber, type, beds, rentPerBed } = row;

      if (!buildingName || !roomNumber || !type || !beds || !rentPerBed) {
        results.failed.push({ row: rowNum, error: "Building, room#, type, beds, rent required" });
        continue;
      }

      // Find or create building
      let building = await prisma.building.findFirst({
        where: { hostelId, name: String(buildingName).trim() },
      });
      if (!building) {
        building = await prisma.building.create({
          data: { name: String(buildingName).trim(), totalFloors: 1, hostelId },
        });
      }

      // Find or create floor
      const fNum = parseInt(floorNumber) || 0;
      let floor = await prisma.floor.findFirst({
        where: { buildingId: building.id, floorNumber: fNum },
      });
      if (!floor) {
        floor = await prisma.floor.create({
          data: {
            name: floorName || `Floor ${fNum}`,
            floorNumber: fNum,
            buildingId: building.id,
          },
        });
      }

      // Check duplicate room
      const existingRoom = await prisma.room.findFirst({
        where: { roomNumber: String(roomNumber), floorId: floor.id },
      });
      if (existingRoom) {
        results.failed.push({ row: rowNum, error: `Room ${roomNumber} already exists` });
        continue;
      }

      // Create room + beds
      const totalBeds = parseInt(beds) || 1;
      const room = await prisma.room.create({
        data: {
          roomNumber: String(roomNumber),
          type: type.toUpperCase(),
          totalBeds,
          rentPerBed: parseFloat(rentPerBed) || 0,
          floorId: floor.id,
        },
      });

      // Create beds
      const bedData = Array.from({ length: totalBeds }, (_, j) => ({
        bedNumber: `${roomNumber}-B${j + 1}`,
        status: "VACANT" as const,
        roomId: room.id,
      }));
      await prisma.bed.createMany({ data: bedData });

      results.success++;
    } catch (err: any) {
      results.failed.push({ row: rowNum, error: err.message || "Unknown error" });
    }
  }

  return NextResponse.json({
    message: `Imported ${results.success} rooms. ${results.failed.length} failed.`,
    ...results,
  });
}

// ── Import Food Menu ──
async function importFoodMenu(rows: any[], hostelId: string) {
  const results = { success: 0, failed: [] as { row: number; error: string }[] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      const { itemName, mealType, rate, category, availableDays } = row;

      if (!itemName || !mealType || !rate) {
        results.failed.push({ row: rowNum, error: "Item name, meal type, and rate required" });
        continue;
      }

      const validMealTypes = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];
      if (!validMealTypes.includes(mealType.toUpperCase())) {
        results.failed.push({ row: rowNum, error: `Invalid meal type: ${mealType}` });
        continue;
      }

      // Parse available days
      let days: string[] = [];
      if (availableDays) {
        days = String(availableDays).toLowerCase().split(",").map((d: string) => d.trim()).filter(Boolean);
      } else {
        days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
      }

      await prisma.foodMenu.create({
        data: {
          itemName: itemName.trim(),
          mealType: mealType.toUpperCase(),
          rate: parseFloat(rate) || 0,
          category: category || "main",
          availableDays: days,
          hostelId,
          isActive: true,
        },
      });

      results.success++;
    } catch (err: any) {
      results.failed.push({ row: rowNum, error: err.message || "Unknown error" });
    }
  }

  return NextResponse.json({
    message: `Imported ${results.success} menu items. ${results.failed.length} failed.`,
    ...results,
  });
}
