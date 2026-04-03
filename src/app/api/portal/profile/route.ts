import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPortalSession } from "@/lib/session";

// PATCH: Resident updates their own food plan preference
export async function PATCH(request: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session || session.user.role !== "RESIDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resident = await prisma.resident.findUnique({
      where: { userId: session.user.id },
      select: { id: true, status: true },
    });

    if (!resident || resident.status !== "ACTIVE") {
      return NextResponse.json({ error: "Resident not found or inactive" }, { status: 404 });
    }

    const body = await request.json();
    const { foodPlan, customFoodFee } = body;

    if (!foodPlan || !["FULL_MESS", "NO_MESS", "CUSTOM"].includes(foodPlan)) {
      return NextResponse.json({ error: "Invalid food plan" }, { status: 400 });
    }

    const updated = await prisma.resident.update({
      where: { id: resident.id },
      data: {
        foodPlan,
        customFoodFee: foodPlan === "CUSTOM" ? (parseFloat(customFoodFee) || 0) : undefined,
      },
      select: { foodPlan: true, customFoodFee: true },
    });

    return NextResponse.json({ message: "Food plan updated", ...updated });
  } catch (error) {
    console.error("Portal profile PATCH error:", error);
    return NextResponse.json({ error: "Failed to update food plan" }, { status: 500 });
  }
}
