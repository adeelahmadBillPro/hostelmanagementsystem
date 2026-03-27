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

    const validMealTypes = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        const mealType = String(row["MealType"] || "").trim().toUpperCase();
        const itemName = String(row["ItemName"] || "").trim();
        const rate = parseFloat(String(row["Rate"] || "0"));
        const category = String(row["Category"] || "main").trim().toLowerCase();
        const availableDaysRaw = String(row["AvailableDays"] || "").trim().toLowerCase();
        const isFreeRaw = String(row["IsFree"] || "No").trim().toLowerCase();
        const maxQty = parseInt(String(row["MaxQty"] || "10"));

        if (!mealType || !itemName) {
          failed.push({ row: rowNum, error: "MealType and ItemName are required" });
          continue;
        }

        if (!validMealTypes.includes(mealType)) {
          failed.push({ row: rowNum, error: `Invalid MealType: ${mealType}. Must be BREAKFAST, LUNCH, DINNER, or SNACK` });
          continue;
        }

        const isFree = ["yes", "true", "1"].includes(isFreeRaw);
        const availableDays = availableDaysRaw
          ? availableDaysRaw.split(",").map((d) => d.trim()).filter(Boolean)
          : ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

        await prisma.foodMenu.create({
          data: {
            mealType: mealType as any,
            itemName,
            rate,
            category,
            availableDays,
            isFree,
            maxQtyPerOrder: maxQty,
            hostelId: params.id,
            isActive: true,
          },
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
    console.error("Import menu error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
