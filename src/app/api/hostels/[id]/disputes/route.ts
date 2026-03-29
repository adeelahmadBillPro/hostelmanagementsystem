import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const hostelId = params.id;
    const disputes = await prisma.billDispute.findMany({
      where: { bill: { hostelId } },
      include: {
        bill: {
          select: { month: true, year: true, totalAmount: true, balance: true },
        },
        resident: {
          include: { user: { select: { name: true, email: true } } },
        },
        resolvedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const stats = {
      total: disputes.length,
      pending: disputes.filter((d) => d.status === "OPEN").length,
      resolved: disputes.filter((d) => d.status === "RESOLVED").length,
      rejected: disputes.filter((d) => d.status === "REJECTED").length,
    };

    return NextResponse.json({ disputes, stats });
  } catch (error) {
    console.error("Get disputes error:", error);
    return NextResponse.json({ error: "Failed to fetch disputes" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { disputeId, status, resolution } = await request.json();

    if (!disputeId || !status) {
      return NextResponse.json({ error: "Dispute ID and status required" }, { status: 400 });
    }

    const validStatuses = ["OPEN", "UNDER_REVIEW", "RESOLVED", "REJECTED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    await prisma.billDispute.update({
      where: { id: disputeId },
      data: {
        status,
        resolution: resolution || null,
        resolvedById: ["RESOLVED", "REJECTED"].includes(status) ? session.user.id : null,
      },
    });

    return NextResponse.json({ message: `Dispute ${status.toLowerCase()}` });
  } catch (error) {
    console.error("Update dispute error:", error);
    return NextResponse.json({ error: "Failed to update dispute" }, { status: 500 });
  }
}
