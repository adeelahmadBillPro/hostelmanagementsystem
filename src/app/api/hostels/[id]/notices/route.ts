import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { noticeSchema } from "@/lib/validations";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notices = await prisma.notice.findMany({
      where: { hostelId: params.id },
      include: {
        createdBy: {
          select: { name: true },
        },
        targetResident: {
          select: {
            id: true,
            user: { select: { name: true } },
          },
        },
        targetRoom: {
          select: { id: true, roomNumber: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedNotices = notices.map((n: any) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      authorName: n.createdBy?.name || 'Unknown',
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
      targetType: n.targetType || 'ALL',
      targetResidentId: n.targetResidentId || null,
      targetResidentName: n.targetResident?.user?.name || null,
      targetRoomId: n.targetRoomId || null,
      targetRoomNumber: n.targetRoom?.roomNumber || null,
    }));

    return NextResponse.json({ notices: formattedNotices });
  } catch (error) {
    console.error('Failed to fetch notices:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = noticeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { title, content } = parsed.data;
    const targetType: string = body.targetType || 'ALL';
    const targetResidentId: string | null = body.targetResidentId || null;
    const targetRoomId: string | null = body.targetRoomId || null;

    // Validate targetType value
    if (!['ALL', 'RESIDENT', 'ROOM'].includes(targetType)) {
      return NextResponse.json({ error: 'Invalid targetType' }, { status: 400 });
    }

    const notice = await prisma.notice.create({
      data: {
        hostelId: params.id,
        createdById: session.user.id,
        title,
        content,
        targetType,
        targetResidentId: targetType === 'RESIDENT' ? targetResidentId : null,
        targetRoomId: targetType === 'ROOM' ? targetRoomId : null,
      },
    });

    return NextResponse.json({ notice }, { status: 201 });
  } catch (error) {
    console.error('Failed to create notice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
