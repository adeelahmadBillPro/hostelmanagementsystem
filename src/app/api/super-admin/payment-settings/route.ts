import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const settings = await prisma.platformSettings.findUnique({ where: { id: "singleton" } });
    return NextResponse.json(settings || {});
  } catch (error) {
    console.error("GET payment-settings error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const {
      bankName, bankTitle, bankAccount, bankIban, bankQrImage,
      jazzcashNumber, jazzcashName, jazzcashQrImage,
      easypaisaNumber, easypaisaName, easypaisaQrImage,
      cashInstructions,
    } = body;

    const settings = await prisma.platformSettings.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        bankName, bankTitle, bankAccount, bankIban, bankQrImage,
        jazzcashNumber, jazzcashName, jazzcashQrImage,
        easypaisaNumber, easypaisaName, easypaisaQrImage,
        cashInstructions,
      },
      update: {
        bankName, bankTitle, bankAccount, bankIban, bankQrImage,
        jazzcashNumber, jazzcashName, jazzcashQrImage,
        easypaisaNumber, easypaisaName, easypaisaQrImage,
        cashInstructions,
      },
    });
    return NextResponse.json(settings);
  } catch (error) {
    console.error("PATCH payment-settings error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
