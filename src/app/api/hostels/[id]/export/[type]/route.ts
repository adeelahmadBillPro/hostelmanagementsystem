import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import * as XLSX from "xlsx";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; type: string } }
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

    const exportType = params.type;
    let data: any[][] = [];
    let sheetName = "Export";

    switch (exportType) {
      case "residents": {
        sheetName = "Residents";
        data.push(["Name", "Email", "Phone", "CNIC", "Gender", "Institution", "Building", "Floor", "Room", "Bed", "Status", "Move In Date", "Advance Paid", "Security Deposit"]);
        const residents = await prisma.resident.findMany({
          where: { hostelId: params.id },
          include: {
            user: { select: { name: true, email: true, phone: true, cnic: true } },
            room: {
              select: {
                roomNumber: true,
                floor: {
                  select: {
                    name: true,
                    building: { select: { name: true } },
                  },
                },
              },
            },
            bed: { select: { bedNumber: true } },
          },
          orderBy: { createdAt: "desc" },
        });
        for (const r of residents) {
          data.push([
            r.user.name,
            r.user.email,
            r.user.phone || "",
            r.user.cnic || "",
            r.gender || "",
            r.institution || "",
            r.room.floor.building.name,
            r.room.floor.name,
            r.room.roomNumber,
            r.bed.bedNumber,
            r.status,
            r.moveInDate.toISOString().split("T")[0],
            r.advancePaid,
            r.securityDeposit,
          ]);
        }
        break;
      }

      case "payments": {
        sheetName = "Payments";
        data.push(["Date", "Resident", "Amount", "Method", "Receipt#", "Bill Month/Year", "Notes"]);
        const payments = await prisma.payment.findMany({
          where: { hostelId: params.id },
          include: {
            resident: { include: { user: { select: { name: true } } } },
            bill: { select: { month: true, year: true } },
          },
          orderBy: { date: "desc" },
        });
        for (const p of payments) {
          data.push([
            p.date.toISOString().split("T")[0],
            p.resident.user.name,
            p.amount,
            p.method,
            p.receiptNumber || "",
            `${p.bill.month}/${p.bill.year}`,
            p.notes || "",
          ]);
        }
        break;
      }

      case "bills": {
        sheetName = "Bills";
        data.push(["Month", "Year", "Resident", "Room Rent", "Food Charges", "Meter Charges", "Other Charges", "Total", "Paid", "Balance", "Status"]);
        const bills = await prisma.monthlyBill.findMany({
          where: { hostelId: params.id },
          include: {
            resident: { include: { user: { select: { name: true } } } },
          },
          orderBy: [{ year: "desc" }, { month: "desc" }],
        });
        for (const b of bills) {
          data.push([
            b.month,
            b.year,
            b.resident.user.name,
            b.roomRent,
            b.foodCharges,
            b.meterCharges,
            b.otherCharges,
            b.totalAmount,
            b.paidAmount,
            b.balance,
            b.status,
          ]);
        }
        break;
      }

      case "rooms": {
        sheetName = "Rooms";
        data.push(["Building", "Floor", "Room Number", "Type", "Total Beds", "Vacant Beds", "Rent/Bed", "Status"]);
        const rooms = await prisma.room.findMany({
          where: {
            floor: {
              building: { hostelId: params.id },
            },
          },
          include: {
            floor: {
              select: {
                name: true,
                building: { select: { name: true } },
              },
            },
            beds: { select: { status: true } },
          },
          orderBy: { roomNumber: "asc" },
        });
        for (const r of rooms) {
          const vacantBeds = r.beds.filter((b) => b.status === "VACANT").length;
          data.push([
            r.floor.building.name,
            r.floor.name,
            r.roomNumber,
            r.type,
            r.totalBeds,
            vacantBeds,
            r.rentPerBed,
            r.status,
          ]);
        }
        break;
      }

      case "staff": {
        sheetName = "Staff";
        data.push(["Name", "Type", "Phone", "CNIC", "Shift", "Salary", "Joining Date", "Active"]);
        const staff = await prisma.staff.findMany({
          where: { hostelId: params.id },
          orderBy: { name: "asc" },
        });
        for (const s of staff) {
          data.push([
            s.name,
            s.staffType,
            s.phone || "",
            s.cnic || "",
            s.shift,
            s.salary,
            s.joiningDate.toISOString().split("T")[0],
            s.isActive ? "Yes" : "No",
          ]);
        }
        break;
      }

      case "expenses": {
        sheetName = "Expenses";
        data.push(["Date", "Category", "Amount", "Description", "Created By"]);
        const expenses = await prisma.expense.findMany({
          where: { hostelId: params.id },
          include: {
            category: { select: { name: true } },
            createdBy: { select: { name: true } },
          },
          orderBy: { date: "desc" },
        });
        for (const e of expenses) {
          data.push([
            e.date.toISOString().split("T")[0],
            e.category.name,
            e.amount,
            e.description || "",
            e.createdBy.name,
          ]);
        }
        break;
      }

      default:
        return NextResponse.json({ error: "Invalid export type" }, { status: 400 });
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Auto-fit column widths
    if (data.length > 0) {
      ws["!cols"] = data[0].map((_: any, colIdx: number) => {
        const maxLen = data.reduce((max, row) => {
          const cellLen = String(row[colIdx] || "").length;
          return cellLen > max ? cellLen : max;
        }, 10);
        return { wch: Math.min(maxLen + 2, 40) };
      });
    }

    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${hostel.name}-${exportType}-${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
