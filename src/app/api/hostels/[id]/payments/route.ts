import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { generateReceiptNumber } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(
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

    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
    const method = searchParams.get("method");
    const search = searchParams.get("search");

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const where: Prisma.PaymentWhereInput = {
      hostelId: params.id,
      date: { gte: startDate, lte: endDate },
    };

    if (method) {
      where.method = method as any;
    }

    if (search) {
      where.resident = {
        user: {
          name: { contains: search, mode: "insensitive" },
        },
      };
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        resident: {
          include: {
            user: { select: { name: true } },
            room: { select: { roomNumber: true } },
          },
        },
        recordedBy: { select: { name: true } },
      },
      orderBy: { date: "desc" },
    });

    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
    const cashTotal = payments
      .filter((p) => p.method === "CASH")
      .reduce((sum, p) => sum + p.amount, 0);
    const bankTotal = payments
      .filter((p) => p.method === "BANK")
      .reduce((sum, p) => sum + p.amount, 0);
    const digitalTotal = payments
      .filter((p) => p.method === "JAZZCASH" || p.method === "EASYPAISA")
      .reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({
      payments,
      stats: {
        totalCollected,
        cashTotal,
        bankTotal,
        digitalTotal,
      },
    });
  } catch (error) {
    console.error("Get payments error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const limited = rateLimit(request, "sensitive");
  if (limited) return limited;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = session.user.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant assigned" }, { status: 403 });
  }

  try {
    const hostel = await prisma.hostel.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!hostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    const body = await request.json();
    const { billId, residentId, amount, method, date, notes } = body;

    if (!billId || !residentId || !amount || !method) {
      return NextResponse.json(
        { error: "billId, residentId, amount, and method are required" },
        { status: 400 }
      );
    }

    if (!["CASH", "BANK", "JAZZCASH", "EASYPAISA"].includes(method)) {
      return NextResponse.json(
        { error: "Invalid payment method" },
        { status: 400 }
      );
    }

    // Get the bill
    const bill = await prisma.monthlyBill.findFirst({
      where: { id: billId, hostelId: params.id },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be positive" },
        { status: 400 }
      );
    }

    if (amount > bill.balance) {
      return NextResponse.json(
        { error: "Amount exceeds remaining balance" },
        { status: 400 }
      );
    }

    const receiptNumber = generateReceiptNumber();
    const newPaidAmount = bill.paidAmount + amount;
    const newBalance = bill.totalAmount - newPaidAmount;

    let newStatus: "PAID" | "PARTIAL" | "UNPAID" | "OVERDUE" = "PARTIAL";
    if (newBalance <= 0) {
      newStatus = "PAID";
    } else if (newPaidAmount > 0) {
      newStatus = "PARTIAL";
    }

    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          amount,
          method,
          date: date ? new Date(date) : new Date(),
          receiptNumber,
          notes: notes || null,
          residentId,
          billId,
          hostelId: params.id,
          recordedById: session.user.id,
        },
        include: {
          resident: {
            include: {
              user: { select: { name: true } },
              room: { select: { roomNumber: true } },
            },
          },
          recordedBy: { select: { name: true } },
        },
      }),
      prisma.monthlyBill.update({
        where: { id: billId },
        data: {
          paidAmount: newPaidAmount,
          balance: Math.max(0, newBalance),
          status: newStatus,
        },
      }),
    ]);

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("Record payment error:", error);
    return NextResponse.json(
      { error: "Failed to record payment" },
      { status: 500 }
    );
  }
}
