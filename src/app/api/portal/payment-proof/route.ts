import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

// GET: Return all payment proofs for logged-in resident
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resident = await prisma.resident.findFirst({
      where: { userId: session.user.id },
    });

    if (!resident) {
      return NextResponse.json({ error: "Resident not found" }, { status: 404 });
    }

    const body = await req.json();
    const { billId, amount, method, transactionId, proofImageUrl } = body;

    if (!billId || !amount || !method) {
      return NextResponse.json(
        { error: "billId, amount, and method are required" },
        { status: 400 }
      );
    }

    // Validate bill belongs to resident
    const bill = await prisma.monthlyBill.findFirst({
      where: { id: billId, residentId: resident.id },
    });

    if (!bill) {
      return NextResponse.json(
        { error: "Bill not found or does not belong to you" },
        { status: 404 }
      );
    }

    // Validate amount
    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 }
      );
    }

    if (amount > bill.balance) {
      return NextResponse.json(
        { error: `Amount cannot exceed bill balance of ${bill.balance}` },
        { status: 400 }
      );
    }

    // Validate method
    const validMethods = ["CASH", "BANK", "JAZZCASH", "EASYPAISA"];
    if (!validMethods.includes(method)) {
      return NextResponse.json(
        { error: "Invalid payment method" },
        { status: 400 }
      );
    }

    // Require transactionId for non-cash methods
    if (method !== "CASH" && !transactionId) {
      return NextResponse.json(
        { error: "Transaction ID is required for non-cash payments" },
        { status: 400 }
      );
    }

    const proof = await prisma.paymentProof.create({
      data: {
        amount: parseFloat(amount),
        method,
        transactionId: transactionId || null,
        proofImageUrl: proofImageUrl || null,
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
