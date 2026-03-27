import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; residentId: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
    }

    const hostelId = params.id;
    const residentId = params.residentId;

    const hostel = await prisma.hostel.findFirst({
      where: { id: hostelId, tenantId: session.user.tenantId! },
    });
    if (!hostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    const resident = await prisma.resident.findFirst({
      where: { id: residentId, hostelId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    if (!resident) {
      return NextResponse.json({ error: "Resident not found" }, { status: 404 });
    }

    // Generate new password
    const newPassword = randomBytes(4).toString("hex");
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: resident.userId },
      data: { password: hashedPassword },
    });

    return NextResponse.json({
      success: true,
      credentials: {
        name: resident.user.name,
        email: resident.user.email,
        password: newPassword,
      },
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
