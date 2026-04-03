import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// GET — Tenant admin: sent + received. Manager: inbox + sent replies.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: userId, role, tenantId } = session.user as any;

  try {
    if (role === "TENANT_ADMIN") {
      // Messages sent by admin to managers
      const sent = await prisma.adminMessage.findMany({
        where: { senderId: userId, tenantId },
        include: {
          sender: { select: { name: true } },
          recipients: {
            include: { user: { select: { id: true, name: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Messages received from managers (admin is recipient)
      const received = await prisma.adminMessageRecipient.findMany({
        where: { userId },
        include: {
          message: {
            include: {
              sender: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { message: { createdAt: "desc" } },
      });

      const unreadFromManagers = received.filter((r) => !r.isRead).length;

      return NextResponse.json({ sent, received, unreadFromManagers });
    }

    if (role === "HOSTEL_MANAGER") {
      // Messages received (from admin)
      const received = await prisma.adminMessageRecipient.findMany({
        where: { userId },
        include: {
          message: {
            include: {
              sender: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { message: { createdAt: "desc" } },
      });

      // Replies sent by this manager
      const replies = await prisma.adminMessage.findMany({
        where: { senderId: userId, tenantId },
        include: {
          sender: { select: { name: true } },
          recipients: {
            include: { user: { select: { id: true, name: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const unread = received.filter((r) => !r.isRead).length;

      return NextResponse.json({ received, replies, unread });
    }

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch (error) {
    console.error("Admin messages GET error:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

// POST — Admin sends to managers; Manager sends reply to admin
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: senderId, role, tenantId } = session.user as any;

  if (role !== "TENANT_ADMIN" && role !== "HOSTEL_MANAGER") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  try {
    const { subject, body, targetAll, targetManagerId } = await request.json();

    if (!subject?.trim() || !body?.trim()) {
      return NextResponse.json({ error: "Subject and message body are required" }, { status: 400 });
    }

    let recipientIds: string[] = [];

    if (role === "TENANT_ADMIN") {
      if (!targetAll && !targetManagerId) {
        return NextResponse.json({ error: "Specify a recipient or send to all managers" }, { status: 400 });
      }

      if (targetAll) {
        const managers = await prisma.user.findMany({
          where: { tenantId, role: "HOSTEL_MANAGER", isActive: true },
          select: { id: true },
        });
        recipientIds = managers.map((m) => m.id);
      } else {
        const manager = await prisma.user.findFirst({
          where: { id: targetManagerId, tenantId, role: "HOSTEL_MANAGER" },
          select: { id: true },
        });
        if (!manager) return NextResponse.json({ error: "Manager not found" }, { status: 404 });
        recipientIds = [manager.id];
      }

      if (recipientIds.length === 0) {
        return NextResponse.json({ error: "No active managers found" }, { status: 400 });
      }
    } else if (role === "HOSTEL_MANAGER") {
      // Manager replies → send to tenant admin
      const admin = await prisma.user.findFirst({
        where: { tenantId, role: "TENANT_ADMIN" },
        select: { id: true },
      });
      if (!admin) return NextResponse.json({ error: "Admin not found" }, { status: 404 });
      recipientIds = [admin.id];
    }

    const message = await prisma.adminMessage.create({
      data: {
        subject: subject.trim(),
        body: body.trim(),
        targetAll: role === "TENANT_ADMIN" && !!targetAll,
        tenantId,
        senderId,
        recipients: {
          create: recipientIds.map((userId) => ({ userId })),
        },
      },
      include: {
        recipients: { include: { user: { select: { id: true, name: true } } } },
      },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Admin messages POST error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}

// PATCH — Mark message(s) as read
export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: userId } = session.user as any;

  try {
    const { messageId } = await request.json();

    if (messageId) {
      await prisma.adminMessageRecipient.updateMany({
        where: { messageId, userId },
        data: { isRead: true, readAt: new Date() },
      });
    } else {
      await prisma.adminMessageRecipient.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin messages PATCH error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
