import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPortalSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getPortalSession();
    if (!session || (session.user.role !== 'RESIDENT' && session.user.role !== 'STAFF')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let hostelId: string | null = null;
    let residentId: string | null = null;
    let roomId: string | null = null;

    if (session.user.role === 'STAFF') {
      hostelId = session.user.hostelId || null;
    } else {
      const resident = await prisma.resident.findUnique({
        where: { userId: session.user.id },
        select: { id: true, hostelId: true, roomId: true },
      });
      if (!resident) {
        return NextResponse.json({ error: 'Resident not found' }, { status: 404 });
      }
      hostelId = resident.hostelId;
      residentId = resident.id;
      roomId = resident.roomId;
    }

    if (!hostelId) {
      return NextResponse.json({ notices: [] });
    }

    // For residents: show notices targeted to ALL, or specifically to them, or their room
    const whereOr: any[] = [{ targetType: 'ALL' }];
    if (residentId) whereOr.push({ targetType: 'RESIDENT', targetResidentId: residentId });
    if (roomId) whereOr.push({ targetType: 'ROOM', targetRoomId: roomId });

    const notices = await prisma.notice.findMany({
      where: { hostelId, OR: whereOr },
      include: {
        createdBy: { select: { name: true } },
        targetResident: { select: { user: { select: { name: true } } } },
        targetRoom: { select: { roomNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedNotices = notices.map((n: any) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      authorName: n.createdBy?.name || 'Admin',
      targetType: n.targetType,
      targetLabel:
        n.targetType === 'RESIDENT'
          ? `For: ${n.targetResident?.user?.name || 'Resident'}`
          : n.targetType === 'ROOM'
          ? `Room: ${n.targetRoom?.roomNumber || ''}`
          : null,
      createdAt: n.createdAt.toISOString(),
    }));

    return NextResponse.json({ notices: formattedNotices });
  } catch (error) {
    console.error('Failed to fetch notices:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
