import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "Your account is not linked to any organization. Please contact support." }, { status: 403 });
    }

    const hostel = await prisma.hostel.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!hostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    const conversations = await prisma.conversation.findMany({
      where: { hostelId: params.id },
      include: {
        resident: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            room: { select: { roomNumber: true } },
            bed: { select: { bedNumber: true } },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            sender: { select: { id: true, name: true, role: true } },
          },
        },
        _count: {
          select: {
            messages: {
              where: {
                isRead: false,
                sender: { role: "RESIDENT" },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const formatted = conversations.map((conv) => ({
      id: conv.id,
      subject: conv.subject,
      isActive: conv.isActive,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      resident: {
        id: conv.resident.id,
        name: conv.resident.user.name,
        email: conv.resident.user.email,
        roomNumber: conv.resident.room.roomNumber,
        bedNumber: conv.resident.bed.bedNumber,
      },
      lastMessage: conv.messages[0]
        ? {
            content: conv.messages[0].content,
            senderName: conv.messages[0].sender.name,
            senderId: conv.messages[0].sender.id,
            senderRole: conv.messages[0].sender.role,
            createdAt: conv.messages[0].createdAt,
          }
        : null,
      unreadCount: conv._count.messages,
    }));

    return NextResponse.json({ conversations: formatted });
  } catch (error) {
    console.error("Failed to fetch conversations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
