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

    const notice = await prisma.notice.create({
      data: {
        hostelId: params.id,
        createdById: session.user.id,
        title,
        content,
      },
    });

    return NextResponse.json({ notice }, { status: 201 });
  } catch (error) {
    console.error('Failed to create notice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
