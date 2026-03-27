import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import * as XLSX from "xlsx";

export async function POST(
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
      return NextResponse.json({ error: "Your account is not linked to any organization. Please contact support." }, { status: 403 });
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

    // Cache for buildings and floors to avoid repeated queries
    const buildingCache: Record<string, string> = {};
    const floorCache: Record<string, string> = {};

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        const buildingName = String(row["Building"] || "").trim();
        const floorNumber = parseInt(String(row["Floor"] || "0"));
        const roomNumber = String(row["RoomNumber"] || "").trim();
        const roomType = String(row["Type"] || "DOUBLE").trim().toUpperCase();
        const totalBeds = parseInt(String(row["TotalBeds"] || "2"));
        const rentPerBed = parseFloat(String(row["RentPerBed"] || "0"));

        if (!buildingName || !roomNumber) {
          failed.push({ row: rowNum, error: "Building and RoomNumber are required" });
          continue;
        }

        if (!["SINGLE", "DOUBLE", "TRIPLE", "QUAD"].includes(roomType)) {
          failed.push({ row: rowNum, error: `Invalid room type: ${roomType}` });
          continue;
        }

        // Find or create building
        const buildingKey = buildingName.toLowerCase();
        let buildingId = buildingCache[buildingKey];
        if (!buildingId) {
          let building = await prisma.building.findFirst({
            where: {
              hostelId: params.id,
              name: { equals: buildingName, mode: "insensitive" },
            },
          });
          if (!building) {
            building = await prisma.building.create({
              data: {
                name: buildingName,
                totalFloors: floorNumber || 1,
                hostelId: params.id,
              },
            });
          } else if (building.totalFloors < floorNumber) {
            await prisma.building.update({
              where: { id: building.id },
              data: { totalFloors: floorNumber },
            });
          }
          buildingId = building.id;
          buildingCache[buildingKey] = buildingId;
        }

        // Find or create floor
        const floorKey = `${buildingId}-${floorNumber}`;
        let floorId = floorCache[floorKey];
        if (!floorId) {
          let floor = await prisma.floor.findFirst({
            where: {
              buildingId,
              floorNumber,
            },
          });
          if (!floor) {
            floor = await prisma.floor.create({
              data: {
                floorNumber,
                name: `Floor ${floorNumber}`,
                buildingId,
              },
            });
          }
          floorId = floor.id;
          floorCache[floorKey] = floorId;
        }

        // Check if room already exists
        const existingRoom = await prisma.room.findFirst({
          where: {
            floorId,
            roomNumber: { equals: roomNumber, mode: "insensitive" },
          },
        });
        if (existingRoom) {
          failed.push({ row: rowNum, error: `Room "${roomNumber}" already exists on this floor` });
          continue;
        }

        // Create room with beds
        await prisma.$transaction(async (tx) => {
          const room = await tx.room.create({
            data: {
              roomNumber,
              type: roomType as any,
              totalBeds,
              rentPerBed,
              floorId,
              status: "ACTIVE",
            },
          });

          // Auto-create beds
          const bedPromises = [];
          for (let b = 1; b <= totalBeds; b++) {
            bedPromises.push(
              tx.bed.create({
                data: {
                  bedNumber: `${roomNumber}-B${b}`,
                  roomId: room.id,
                  status: "VACANT",
                },
              })
            );
          }
          await Promise.all(bedPromises);
        });

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
    console.error("Import rooms error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
