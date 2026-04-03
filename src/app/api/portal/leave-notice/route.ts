import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPortalSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";

const VALID_REASONS = [
  "DEGREE_COMPLETION",
  "JOB_CHANGE",
  "FAMILY_RELOCATION",
  "MARRIAGE",
  "FINANCIAL",
  "HOSTEL_TRANSFER",
  "OTHER",
];

// GET: fetch my own leave notices
export async function GET() {
  try {
    const session = await getPortalSession();
    if (!session || (session.user.role !== "RESIDENT" && session.user.role !== "STAFF")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notices = await prisma.leaveNotice.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ notices });
  } catch (error) {
    console.error("GET leave-notice error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: submit a new leave notice
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  try {
    const session = await getPortalSession();
    if (!session || (session.user.role !== "RESIDENT" && session.user.role !== "STAFF")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { reason, description, lastDay } = body;

    if (!reason) {
      return NextResponse.json({ error: "Reason for leaving is required" }, { status: 400 });
    }
    if (!VALID_REASONS.includes(reason)) {
      return NextResponse.json({ error: "Invalid reason selected" }, { status: 400 });
    }
    if (!lastDay) {
      return NextResponse.json({ error: "Last day date is required" }, { status: 400 });
    }

    const lastDayDate = new Date(lastDay);
    if (isNaN(lastDayDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (lastDayDate < today) {
      return NextResponse.json({ error: "Last day cannot be in the past" }, { status: 400 });
    }

    let hostelId: string | null = null;
    let residentId: string | null = null;

    if (session.user.role === "RESIDENT") {
      const resident = await prisma.resident.findFirst({
        where: { userId: session.user.id, status: "ACTIVE" },
      });
      if (!resident) {
        return NextResponse.json({ error: "Active resident record not found" }, { status: 404 });
      }
      hostelId = resident.hostelId;
      residentId = resident.id;
    } else {
      hostelId = session.user.hostelId || null;
    }

    if (!hostelId) {
      return NextResponse.json({ error: "Not assigned to a hostel" }, { status: 400 });
    }

    // Block duplicate pending notice
    const existing = await prisma.leaveNotice.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ["PENDING", "ACKNOWLEDGED"] },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "You already have an active leave notice. Cancel it before submitting a new one." },
        { status: 409 }
      );
    }

    const notice = await prisma.leaveNotice.create({
      data: {
        type: session.user.role,
        reason,
        description: description?.trim() || null,
        lastDay: lastDayDate,
        status: "PENDING",
        userId: session.user.id,
        hostelId,
        residentId,
      },
    });

    return NextResponse.json({ notice }, { status: 201 });
  } catch (error) {
    console.error("POST leave-notice error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: cancel my own pending leave notice
export async function DELETE(req: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const noticeId = searchParams.get("noticeId");
    if (!noticeId) {
      return NextResponse.json({ error: "noticeId is required" }, { status: 400 });
    }

    const notice = await prisma.leaveNotice.findFirst({
      where: { id: noticeId, userId: session.user.id },
    });
    if (!notice) {
      return NextResponse.json({ error: "Leave notice not found" }, { status: 404 });
    }
    if (notice.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Cannot cancel a completed leave notice" },
        { status: 400 }
      );
    }

    await prisma.leaveNotice.delete({ where: { id: noticeId } });

    return NextResponse.json({ message: "Leave notice cancelled successfully" });
  } catch (error) {
    console.error("DELETE leave-notice error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
