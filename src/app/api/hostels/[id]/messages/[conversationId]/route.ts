import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string; conversationId: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant assigned" }, { status: 403 });
    }

    const hostel = await prisma.hostel.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!hostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: params.conversationId,
        hostelId: params.id,
      },
      include: {
        resident: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            room: { select: { roomNumber: true } },
            bed: { select: { bedNumber: true } },
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            sender: { select: { id: true, name: true, role: true } },
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Mark unread messages from residents as read
    await prisma.message.updateMany({
      where: {
        conversationId: params.conversationId,
        isRead: false,
        sender: { role: "RESIDENT" },
      },
      data: { isRead: true },
    });

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("Failed to fetch conversation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; conversationId: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant assigned" }, { status: 403 });
    }

    const hostel = await prisma.hostel.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!hostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: params.conversationId,
        hostelId: params.id,
        isActive: true,
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found or closed" }, { status: 404 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const message = await prisma.message.create({
      data: {
        content,
        senderId: session.user.id,
        conversationId: params.conversationId,
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: params.conversationId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Failed to send message:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
