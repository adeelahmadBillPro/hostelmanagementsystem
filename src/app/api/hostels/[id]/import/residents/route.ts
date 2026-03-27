import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import * as XLSX from "xlsx";
import { hash } from "bcryptjs";

function generatePassword(length = 8): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

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

    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Excel file is empty" }, { status: 400 });
    }

    let successCount = 0;
    const failed: { row: number; error: string }[] = [];

    // Pre-fetch buildings, floors, rooms, beds for this hostel
    const buildings = await prisma.building.findMany({
      where: { hostelId: params.id },
      include: {
        floors: {
          include: {
            rooms: {
              include: {
                beds: true,
              },
            },
          },
        },
      },
    });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // Excel row (1-indexed + header)

      try {
        const name = String(row["Name"] || "").trim();
        const email = String(row["Email"] || "").trim();
        const phone = String(row["Phone"] || "").trim();
        const cnic = String(row["CNIC"] || "").trim();
        const gender = String(row["Gender"] || "").trim();
        const institution = String(row["Institution"] || "").trim();
        const buildingName = String(row["Building"] || "").trim();
        const floorName = String(row["Floor"] || "").trim();
        const roomName = String(row["Room"] || "").trim();
        const bedName = String(row["Bed"] || "").trim();
        const advance = parseFloat(row["Advance"]) || 0;
        const securityDeposit = parseFloat(row["SecurityDeposit"]) || 0;

        if (!name || !email) {
          failed.push({ row: rowNum, error: "Name and Email are required" });
          continue;
        }

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
          failed.push({ row: rowNum, error: `Email ${email} already exists` });
          continue;
        }

        // Find building
        const building = buildings.find(
          (b) => b.name.toLowerCase() === buildingName.toLowerCase()
        );
        if (!building) {
          failed.push({ row: rowNum, error: `Building "${buildingName}" not found` });
          continue;
        }

        // Find floor
        const floor = building.floors.find(
          (f) =>
            f.name.toLowerCase() === floorName.toLowerCase() ||
            String(f.floorNumber) === floorName
        );
        if (!floor) {
          failed.push({ row: rowNum, error: `Floor "${floorName}" not found in ${buildingName}` });
          continue;
        }

        // Find room
        const room = floor.rooms.find(
          (r) => r.roomNumber.toLowerCase() === roomName.toLowerCase()
        );
        if (!room) {
          failed.push({ row: rowNum, error: `Room "${roomName}" not found on Floor ${floorName}` });
          continue;
        }

        // Find bed
        const bed = room.beds.find(
          (b) => b.bedNumber.toLowerCase() === bedName.toLowerCase()
        );
        if (!bed) {
          failed.push({ row: rowNum, error: `Bed "${bedName}" not found in Room ${roomName}` });
          continue;
        }

        // Check bed is vacant
        if (bed.status !== "VACANT") {
          failed.push({ row: rowNum, error: `Bed "${bedName}" is ${bed.status}, not VACANT` });
          continue;
        }

        // Generate password and hash
        const rawPassword = generatePassword();
        const hashedPassword = await hash(rawPassword, 10);

        // Create user and resident in a transaction
        await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              name,
              email,
              phone: phone || null,
              cnic: cnic || null,
              password: hashedPassword,
              role: "RESIDENT",
              tenantId,
              hostelId: params.id,
            },
          });

          await tx.resident.create({
            data: {
              userId: user.id,
              hostelId: params.id,
              roomId: room.id,
              bedId: bed.id,
              gender: gender || null,
              institution: institution || null,
              advancePaid: advance,
              securityDeposit,
              moveInDate: new Date(),
              status: "ACTIVE",
            },
          });

          await tx.bed.update({
            where: { id: bed.id },
            data: { status: "OCCUPIED" },
          });
        });

        // Update local cache so same bed isn't reused
        bed.status = "OCCUPIED";
        successCount++;
      } catch (err: any) {
        failed.push({ row: rowNum, error: err.message || "Unknown error" });
      }
    }

    return NextResponse.json({
      success: successCount,
      failed,
      total: rows.length,
    });
  } catch (error: any) {
    console.error("Import residents error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
