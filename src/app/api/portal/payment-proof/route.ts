import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

// GET: Return all payment proofs for logged-in resident
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
    }

    const resident = await prisma.resident.findFirst({
      where: { userId: session.user.id },
    });

    if (!resident) {
      return NextResponse.json({ error: "Resident not found" }, { status: 404 });
    }

    const proofs = await prisma.paymentProof.findMany({
      where: { residentId: resident.id },
      include: {
        bill: {
          select: {
            id: true,
            month: true,
            year: true,
            totalAmount: true,
            paidAmount: true,
            balance: true,
            status: true,
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    return NextResponse.json(proofs);
  } catch (error) {
    console.error("Error fetching payment proofs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Submit a new payment proof
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "sensitive");
  if (limited) return limited;

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
    }

    const resident = await prisma.resident.findFirst({
      where: { userId: session.user.id },
    });

    if (!resident) {
      return NextResponse.json({ error: "Resident not found" }, { status: 404 });
    }

    const body = await req.json();
    const { billId, amount, method, transactionId, proofImageUrl, note } = body;

    // —— Required field validation ————————————————————————————————————————
    if (!billId) return NextResponse.json({ error: "Please select a bill" }, { status: 400 });
    if (!amount) return NextResponse.json({ error: "Amount is required" }, { status: 400 });
    if (!method) return NextResponse.json({ error: "Payment method is required" }, { status: 400 });

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
    }

    // —— Validate method ——————————————————————————————————————————————————
    const validMethods = ["CASH", "BANK", "JAZZCASH", "EASYPAISA"];
    if (!validMethods.includes(method)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
    }

    // —— Require transaction ID for non-cash ———————————————————————————————
    if (method !== "CASH" && !transactionId?.trim()) {
      return NextResponse.json(
        { error: "Transaction ID is required for non-cash payments" },
        { status: 400 }
      );
    }

    // —— Validate bill belongs to resident ————————————————————————————————
    const bill = await prisma.monthlyBill.findFirst({
      where: { id: billId, residentId: resident.id },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found or does not belong to you" }, { status: 404 });
    }

    if (bill.status === "PAID") {
      return NextResponse.json({ error: "This bill is already fully paid" }, { status: 400 });
    }

    if (parsedAmount > bill.balance) {
      return NextResponse.json(
        { error: `Amount (PKR ${parsedAmount.toLocaleString()}) cannot exceed remaining balance of PKR ${bill.balance.toLocaleString()}` },
        { status: 400 }
      );
    }

    // —— Block duplicate pending proof for same bill ——————————————————————
    const existingPending = await prisma.paymentProof.findFirst({
      where: { billId, residentId: resident.id, status: "PENDING" },
    });

    if (existingPending) {
      return NextResponse.json(
        { error: "You already have a pending payment proof for this bill. Please wait for it to be reviewed before submitting another." },
        { status: 409 }
      );
    }

    // —— Create proof —————————————————————————————————————————————————————
    const proof = await prisma.paymentProof.create({
      data: {
        amount: parsedAmount,
        method,
        transactionId: transactionId?.trim() || null,
        proofImageUrl: proofImageUrl || null,
        notes: note?.trim() || null,
        status: "PENDING",
        residentId: resident.id,
        billId,
      },
      include: {
        bill: {
          select: {
            id: true,
            month: true,
            year: true,
            totalAmount: true,
            paidAmount: true,
            balance: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json(proof, { status: 201 });
  } catch (error) {
    console.error("Error creating payment proof:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
