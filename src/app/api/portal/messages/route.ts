import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(_request: NextRequest) {
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

    const conversations = await prisma.conversation.findMany({
      where: { residentId: resident.id },
      include: {
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
                senderId: { not: session.user.id },
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
      lastMessage: conv.messages[0]
        ? {
            content: conv.messages[0].content,
            senderName: conv.messages[0].sender.name,
            senderId: conv.messages[0].sender.id,
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

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { subject, message } = body;

    if (!subject || !message) {
      return NextResponse.json(
        { error: "subject and message are required" },
        { status: 400 }
      );
    }

    const conversation = await prisma.conversation.create({
      data: {
        subject,
        residentId: resident.id,
        hostelId: resident.hostelId,
        messages: {
          create: {
            content: message,
            senderId: session.user.id,
          },
        },
      },
      include: {
        messages: {
          include: {
            sender: { select: { id: true, name: true, role: true } },
          },
        },
      },
    });

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    console.error("Failed to create conversation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
