import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.user.role !== 'RESIDENT' && session.user.role !== 'STAFF')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let hostelId: string | null = null;

    if (session.user.role === 'STAFF') {
      hostelId = session.user.hostelId || null;
    } else {
      const resident = await prisma.resident.findUnique({
        where: { userId: session.user.id },
        include: { hostel: true },
      });
      if (!resident) {
        return NextResponse.json({ error: 'Resident not found' }, { status: 404 });
      }
      hostelId = resident.hostelId;
    }

    if (!hostelId) {
      return NextResponse.json({ notices: [] });
    }

    const notices = await prisma.notice.findMany({
      where: { hostelId },
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
      authorName: n.createdBy?.name || 'Admin',
      createdAt: n.createdAt.toISOString(),
    }));

    return NextResponse.json({ notices: formattedNotices });
  } catch (error) {
    console.error('Failed to fetch notices:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
