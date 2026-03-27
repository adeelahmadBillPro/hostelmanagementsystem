import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { generateReceiptNumber } from "@/lib/utils";

// GET: Return all payment proofs for this hostel (manager view)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hostelId = params.id;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: any = {
      bill: { hostelId },
    };

    if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      where.status = status;
    }

    const proofs = await prisma.paymentProof.findMany({
      where,
      include: {
        resident: {
          include: {
            user: {
              select: { name: true, email: true },
            },
            room: {
              select: { roomNumber: true },
            },
          },
        },
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
        reviewedBy: {
          select: { name: true },
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

// PATCH: Approve or reject a payment proof
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hostelId = params.id;
    const body = await req.json();
    const { proofId, action, rejectionReason } = body;

    if (!proofId || !action) {
      return NextResponse.json(
        { error: "proofId and action are required" },
        { status: 400 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Action must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    // Fetch the proof with bill info
    const proof = await prisma.paymentProof.findFirst({
      where: {
        id: proofId,
        bill: { hostelId },
        status: "PENDING",
      },
      include: {
        bill: true,
      },
    });

    if (!proof) {
      return NextResponse.json(
        { error: "Payment proof not found or already reviewed" },
        { status: 404 }
      );
    }

    if (action === "reject") {
      if (!rejectionReason) {
        return NextResponse.json(
          { error: "Rejection reason is required" },
          { status: 400 }
        );
      }

      const updatedProof = await prisma.paymentProof.update({
        where: { id: proofId },
        data: {
          status: "REJECTED",
          rejectionReason,
          reviewedAt: new Date(),
          reviewedById: session.user.id,
        },
      });

      return NextResponse.json(updatedProof);
    }

    // Approve: Create actual Payment and update bill
    const result = await prisma.$transaction(async (tx) => {
      // Create Payment record
      const payment = await tx.payment.create({
        data: {
          amount: proof.amount,
          method: proof.method,
          receiptNumber: generateReceiptNumber(),
          notes: `Payment proof approved. Transaction ID: ${proof.transactionId || "N/A"}`,
          residentId: proof.residentId,
          billId: proof.billId,
          hostelId,
          recordedById: session.user.id,
        },
      });

      // Update bill amounts
      const newPaidAmount = proof.bill.paidAmount + proof.amount;
      const newBalance = proof.bill.totalAmount - newPaidAmount;
      let newStatus: "PAID" | "PARTIAL" | "UNPAID" | "OVERDUE" = "UNPAID";

      if (newBalance <= 0) {
        newStatus = "PAID";
      } else if (newPaidAmount > 0) {
        newStatus = "PARTIAL";
      }

      await tx.monthlyBill.update({
        where: { id: proof.billId },
        data: {
          paidAmount: newPaidAmount,
          balance: Math.max(0, newBalance),
          status: newStatus,
        },
      });

      // Mark proof as approved
      const updatedProof = await tx.paymentProof.update({
        where: { id: proofId },
        data: {
          status: "APPROVED",
          reviewedAt: new Date(),
          reviewedById: session.user.id,
        },
      });

      return { proof: updatedProof, payment };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error reviewing payment proof:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
