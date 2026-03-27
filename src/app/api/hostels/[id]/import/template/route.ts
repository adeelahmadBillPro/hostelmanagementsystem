import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "residents";

    let headers: string[][] = [];
    let sampleData: any[][] = [];

    if (type === "residents") {
      headers = [["Name", "Email", "Phone", "CNIC", "Gender", "Institution", "Building", "Floor", "Room", "Bed", "Advance", "SecurityDeposit"]];
      sampleData = [
        ["Ahmed Khan", "ahmed@example.com", "03001234567", "3520112345671", "Male", "LUMS", "Building A", "1", "101", "101-B1", 5000, 10000],
        ["Sara Ali", "sara@example.com", "03119876543", "3520198765432", "Female", "NUST", "Building A", "1", "102", "102-B1", 3000, 8000],
      ];
    } else if (type === "rooms") {
      headers = [["Building", "Floor", "RoomNumber", "Type", "TotalBeds", "RentPerBed"]];
      sampleData = [
        ["Building A", 1, "101", "DOUBLE", 2, 15000],
        ["Building A", 1, "102", "TRIPLE", 3, 12000],
        ["Building B", 2, "201", "SINGLE", 1, 20000],
      ];
    } else if (type === "menu") {
      headers = [["MealType", "ItemName", "Rate", "Category", "AvailableDays", "IsFree", "MaxQty"]];
      sampleData = [
        ["BREAKFAST", "Paratha", 50, "main", "monday,tuesday,wednesday,thursday,friday,saturday,sunday", "No", 5],
        ["LUNCH", "Chicken Biryani", 250, "main", "monday,wednesday,friday", "No", 3],
        ["DINNER", "Roti", 10, "bread", "monday,tuesday,wednesday,thursday,friday,saturday,sunday", "Yes", 4],
      ];
    } else {
      return NextResponse.json({ error: "Invalid template type" }, { status: 400 });
    }

    const wb = XLSX.utils.book_new();
    const wsData = [...headers, ...sampleData];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    const colWidths = headers[0].map((h: string) => ({ wch: Math.max(h.length + 5, 15) }));
    ws["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "Template");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${type}-import-template.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error("Template generation error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
