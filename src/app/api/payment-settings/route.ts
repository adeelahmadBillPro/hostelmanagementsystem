import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// Any authenticated user can read payment settings (to know where to send payment)
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const settings = await prisma.platformSettings.findUnique({ where: { id: "singleton" } });
    return NextResponse.json(settings || {});
  } catch (error) {
    console.error("GET public payment-settings error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
