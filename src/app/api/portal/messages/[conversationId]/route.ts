import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(
  _request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== "RESIDENT") {
      return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
    }

    const resident = await prisma.resident.findUnique({
      where: { userId: session.user.id },
    });

    if (!resident) {
      return NextResponse.json({ error: "Resident not found" }, { status: 404 });
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: params.conversationId,
        residentId: resident.id,
      },
      include: {
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

    // Mark unread messages from other senders as read
    await prisma.message.updateMany({
      where: {
        conversationId: params.conversationId,
        isRead: false,
        senderId: { not: session.user.id },
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
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== "RESIDENT") {
      return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
    }

    const resident = await prisma.resident.findUnique({
      where: { userId: session.user.id },
    });

    if (!resident) {
      return NextResponse.json({ error: "Resident not found" }, { status: 404 });
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: params.conversationId,
        residentId: resident.id,
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
