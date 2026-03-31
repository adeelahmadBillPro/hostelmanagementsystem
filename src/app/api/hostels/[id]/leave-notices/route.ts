import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { sendEmail } from "@/lib/email";

// GET: all leave notices for this hostel (manager/admin view)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
    }

    const allowedRoles = ["TENANT_ADMIN", "HOSTEL_MANAGER", "SUPER_ADMIN"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const hostelId = params.id;
    const hostel = await prisma.hostel.findFirst({
      where: { id: hostelId, tenantId: session.user.tenantId! },
    });
    if (!hostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: any = { hostelId };
    if (status && ["PENDING", "ACKNOWLEDGED", "COMPLETED"].includes(status)) {
      where.status = status;
    }

    const notices = await prisma.leaveNotice.findMany({
      where,
      include: {
        user: { select: { name: true, email: true, phone: true } },
        resident: {
          include: {
            room: { select: { roomNumber: true } },
            bed: { select: { bedNumber: true } },
          },
        },
        acknowledgedBy: { select: { name: true } },
      },
      orderBy: [{ status: "asc" }, { lastDay: "asc" }],
    });

    const pending = notices.filter((n) => n.status === "PENDING").length;
    const acknowledged = notices.filter((n) => n.status === "ACKNOWLEDGED").length;
    const upcoming = notices.filter(
      (n) => new Date(n.lastDay) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    ).length;

    return NextResponse.json({
      notices,
      stats: { total: notices.length, pending, acknowledged, upcoming },
    });
  } catch (error) {
    console.error("GET leave-notices error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH: acknowledge or complete a leave notice
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
    }

    const allowedRoles = ["TENANT_ADMIN", "HOSTEL_MANAGER", "SUPER_ADMIN"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const hostelId = params.id;
    const hostel = await prisma.hostel.findFirst({
      where: { id: hostelId, tenantId: session.user.tenantId! },
    });
    if (!hostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    const body = await request.json();
    const { noticeId, action } = body;

    if (!noticeId || !action) {
      return NextResponse.json({ error: "noticeId and action are required" }, { status: 400 });
    }
    if (!["acknowledge", "complete"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const notice = await prisma.leaveNotice.findFirst({
      where: { id: noticeId, hostelId },
      include: {
        user: { select: { name: true, email: true } },
        resident: {
          include: {
            room: { select: { roomNumber: true } },
            bed: { select: { bedNumber: true, id: true } },
          },
        },
      },
    });
    if (!notice) {
      return NextResponse.json({ error: "Leave notice not found" }, { status: 404 });
    }

    if (action === "acknowledge") {
      if (notice.status !== "PENDING") {
        return NextResponse.json({ error: "Notice is not in PENDING status" }, { status: 400 });
      }
      const updated = await prisma.leaveNotice.update({
        where: { id: noticeId },
        data: {
          status: "ACKNOWLEDGED",
          acknowledgedAt: new Date(),
          acknowledgedById: session.user.id,
        },
      });

      // Email the person to confirm acknowledgment
      if (notice.user.email) {
        const lastDayFormatted = new Date(notice.lastDay).toLocaleDateString("en-PK", {
          day: "numeric", month: "long", year: "numeric",
        });
        await sendEmail({
          to: notice.user.email,
          subject: "HostelHub — Your Leave Notice Has Been Acknowledged",
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
              <div style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
                <h1 style="color:white;margin:0;font-size:24px;">HostelHub</h1>
              </div>
              <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
                <h2 style="color:#1e293b;">Leave Notice Acknowledged</h2>
                <p style="color:#475569;">Hi ${notice.user.name}, your leave notice has been received and acknowledged by the hostel management.</p>
                <div style="background:white;padding:16px;border-radius:8px;border:1px solid #e2e8f0;margin:16px 0;">
                  <p style="margin:4px 0;"><strong>Hostel:</strong> ${hostel.name}</p>
                  <p style="margin:4px 0;"><strong>Last Day:</strong> ${lastDayFormatted}</p>
                  ${notice.resident ? `<p style="margin:4px 0;"><strong>Room:</strong> ${(notice.resident as any).room?.roomNumber || "N/A"}</p>` : ""}
                </div>
                <p style="color:#475569;">Please ensure you complete all handover procedures before your last day.</p>
              </div>
            </div>
          `,
        }).catch(() => {});
      }

      return NextResponse.json({ notice: updated });
    }

    // action === "complete"
    if (notice.status === "COMPLETED") {
      return NextResponse.json({ error: "Notice already completed" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.leaveNotice.update({
        where: { id: noticeId },
        data: { status: "COMPLETED" },
      });

      // If resident: auto-checkout
      if (notice.residentId) {
        await tx.resident.update({
          where: { id: notice.residentId },
          data: {
            status: "CHECKED_OUT",
            moveOutDate: new Date(notice.lastDay),
          },
        });
        if ((notice.resident as any)?.bed?.id) {
          await tx.bed.update({
            where: { id: (notice.resident as any).bed.id },
            data: { status: "VACANT" },
          });
        }
      }

      return updated;
    });

    return NextResponse.json({ notice: result, checkedOut: !!notice.residentId });
  } catch (error) {
    console.error("PATCH leave-notices error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
