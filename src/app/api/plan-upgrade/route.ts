import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// GET: Tenant sees their upgrade requests / Admin sees all requests
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role === "SUPER_ADMIN") {
      // Admin: see all pending requests
      const requests = await prisma.planUpgradeRequest.findMany({
        include: {
          tenant: { select: { id: true, name: true, email: true } },
          requestedPlan: { select: { id: true, name: true, price: true } },
          reviewedBy: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      const pending = requests.filter((r) => r.status === "PENDING").length;
      return NextResponse.json({ requests, stats: { total: requests.length, pending } });
    }

    // Tenant: see their own requests
    if (!session.user.tenantId) {
      return NextResponse.json({ error: "Not a tenant" }, { status: 403 });
    }

    const requests = await prisma.planUpgradeRequest.findMany({
      where: { tenantId: session.user.tenantId },
      include: {
        requestedPlan: { select: { name: true, price: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get all available plans
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    // Get current tenant info
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      include: { plan: true },
    });

    return NextResponse.json({ requests, plans, currentPlan: tenant?.plan || null, isTrial: tenant?.isTrial });
  } catch (error) {
    console.error("GET plan-upgrade error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Tenant submits upgrade request with payment proof
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.user.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { planId, amount, method, transactionId, proofImageUrl, notes } = body;

    if (!planId) return NextResponse.json({ error: "Please select a plan" }, { status: 400 });
    if (!amount || parseFloat(amount) <= 0) return NextResponse.json({ error: "Valid amount is required" }, { status: 400 });
    if (!method) return NextResponse.json({ error: "Payment method is required" }, { status: 400 });
    if (method !== "CASH" && !transactionId?.trim()) {
      return NextResponse.json({ error: "Transaction ID required for non-cash payments" }, { status: 400 });
    }

    // Check plan exists
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    // Check no pending request
    const existing = await prisma.planUpgradeRequest.findFirst({
      where: { tenantId: session.user.tenantId, status: "PENDING" },
    });
    if (existing) {
      return NextResponse.json({ error: "You already have a pending upgrade request. Wait for it to be reviewed." }, { status: 409 });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: session.user.tenantId } });

    const req = await prisma.planUpgradeRequest.create({
      data: {
        tenantId: session.user.tenantId,
        currentPlanId: tenant?.planId || null,
        requestedPlanId: planId,
        amount: parseFloat(amount),
        method,
        transactionId: transactionId?.trim() || null,
        proofImageUrl: proofImageUrl || null,
        notes: notes?.trim() || null,
        status: "PENDING",
      },
      include: { requestedPlan: { select: { name: true } } },
    });

    return NextResponse.json(req, { status: 201 });
  } catch (error) {
    console.error("POST plan-upgrade error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH: Admin approves or rejects
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { requestId, action, rejectionReason } = body;

    if (!requestId || !action) {
      return NextResponse.json({ error: "requestId and action required" }, { status: 400 });
    }
    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const req = await prisma.planUpgradeRequest.findUnique({
      where: { id: requestId },
      include: { requestedPlan: true },
    });
    if (!req || req.status !== "PENDING") {
      return NextResponse.json({ error: "Request not found or already reviewed" }, { status: 404 });
    }

    if (action === "approve") {
      // Update request + upgrade tenant plan
      await prisma.$transaction(async (tx) => {
        await tx.planUpgradeRequest.update({
          where: { id: requestId },
          data: { status: "APPROVED", reviewedAt: new Date(), reviewedById: session.user.id },
        });
        await tx.tenant.update({
          where: { id: req.tenantId },
          data: {
            planId: req.requestedPlanId,
            isTrial: false,
            planStartedAt: new Date(),
          },
        });
      });
      return NextResponse.json({ message: `Approved — tenant upgraded to ${req.requestedPlan.name}` });
    }

    // Reject
    await prisma.planUpgradeRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        rejectionReason: rejectionReason || null,
        reviewedAt: new Date(),
        reviewedById: session.user.id,
      },
    });
    return NextResponse.json({ message: "Request rejected" });
  } catch (error) {
    console.error("PATCH plan-upgrade error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
