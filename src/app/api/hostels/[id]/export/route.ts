import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(
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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "residents";

    if (type === "residents") {
      const residents = await prisma.resident.findMany({
        where: { hostelId },
        include: {
          user: { select: { name: true, email: true, phone: true, cnic: true } },
          room: { select: { roomNumber: true } },
          bed: { select: { bedNumber: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      const data = residents.map((r: any) => ({
        Name: r.user.name,
        Email: r.user.email,
        Phone: r.user.phone || "",
        CNIC: r.user.cnic || "",
        Room: r.room.roomNumber,
        Bed: r.bed.bedNumber,
        Status: r.status,
        FoodPlan: r.foodPlan || "FULL_MESS",
        MoveInDate: r.moveInDate?.toISOString().split("T")[0] || "",
        AdvancePaid: r.advancePaid,
        SecurityDeposit: r.securityDeposit,
      }));

      return NextResponse.json({ data, type: "residents" });
    }

    if (type === "payments") {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const payments = await prisma.payment.findMany({
        where: { hostelId, date: { gte: startOfMonth } },
        include: {
          resident: { include: { user: { select: { name: true } } } },
          bill: { select: { month: true, year: true } },
        },
        orderBy: { date: "desc" },
      });

      const data = payments.map((p: any) => ({
        Date: p.date.toISOString().split("T")[0],
        Resident: p.resident?.user?.name || "N/A",
        Amount: p.amount,
        Method: p.method,
        ReceiptNumber: p.receiptNumber || "",
        BillMonth: p.bill ? `${p.bill.month}/${p.bill.year}` : "",
        Notes: p.notes || "",
      }));

      return NextResponse.json({ data, type: "payments" });
    }

    if (type === "staff") {
      const staff = await prisma.staff.findMany({
        where: { hostelId, isActive: true },
        orderBy: { name: "asc" },
      });

      const data = staff.map((s) => ({
        Name: s.name,
        CNIC: s.cnic || "",
        Phone: s.phone || "",
        Type: s.staffType,
        Shift: s.shift,
        Salary: s.salary,
        JoiningDate: s.joiningDate.toISOString().split("T")[0],
        FreeRoom: s.freeAccommodation ? "Yes" : "No",
        FreeFood: s.freeFood ? "Yes" : "No",
      }));

      return NextResponse.json({ data, type: "staff" });
    }

    if (type === "billing") {
      const bills = await prisma.monthlyBill.findMany({
        where: { hostelId },
        include: {
          resident: { include: { user: { select: { name: true } }, room: { select: { roomNumber: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      });

      const data = bills.map((b: any) => ({
        Resident: b.resident?.user?.name || "N/A",
        Room: b.resident?.room?.roomNumber || "",
        Month: `${b.month}/${b.year}`,
        RoomRent: b.roomRent,
        FoodCharges: b.foodCharges,
        FixedFoodFee: b.fixedFoodFee || 0,
        OtherCharges: b.otherCharges,
        Total: b.totalAmount,
        Paid: b.paidAmount,
        Balance: b.balance,
        Status: b.status,
      }));

      return NextResponse.json({ data, type: "billing" });
    }

    if (type === "rooms") {
      const rooms = await prisma.room.findMany({
        where: { floor: { building: { hostelId } } },
        include: {
          floor: { include: { building: { select: { name: true } } } },
          beds: { select: { status: true } },
        },
        orderBy: { roomNumber: "asc" },
      });

      const data = rooms.map((r) => ({
        RoomNumber: r.roomNumber,
        Building: r.floor.building.name,
        Floor: r.floor.name,
        Type: r.type,
        TotalBeds: r.totalBeds,
        Occupied: r.beds.filter((b) => b.status === "OCCUPIED").length,
        Vacant: r.beds.filter((b) => b.status === "VACANT").length,
        RentPerBed: r.rentPerBed,
        Status: r.status,
      }));

      return NextResponse.json({ data, type: "rooms" });
    }

    if (type === "expenses") {
      const expenses = await prisma.expense.findMany({
        where: { hostelId },
        include: { category: { select: { name: true } } },
        orderBy: { date: "desc" },
        take: 500,
      });

      const data = expenses.map((e: any) => ({
        Date: e.date.toISOString().split("T")[0],
        Category: e.category?.name || "Uncategorized",
        Amount: e.amount,
        Description: e.description || "",
        ReceiptURL: e.receiptUrl || "",
      }));

      return NextResponse.json({ data, type: "expenses" });
    }

    return NextResponse.json({ error: "Invalid export type" }, { status: 400 });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}
