import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.user.role !== 'RESIDENT' && session.user.role !== 'STAFF')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ——— STAFF PORTAL DASHBOARD ——————————————————————————————————————————
    if (session.user.role === 'STAFF') {
      const hostelId = session.user.hostelId;
      if (!hostelId) {
        return NextResponse.json({ error: 'Staff not assigned to a hostel' }, { status: 404 });
      }

      const hostel = await prisma.hostel.findUnique({
        where: { id: hostelId },
        select: { id: true, name: true, address: true, contact: true },
      });

      const recentNotices = await prisma.notice.findMany({
        where: { hostelId },
        include: { createdBy: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 3,
      });

      return NextResponse.json({
        role: 'STAFF',
        staff: {
          name: session.user.name || 'Staff',
          hostelName: hostel?.name || 'N/A',
        },
        hostel,
        recentNotices: recentNotices.map((n: any) => ({
          id: n.id,
          title: n.title,
          content: n.content,
          createdAt: n.createdAt.toISOString(),
        })),
      });
    }

    // ——— RESIDENT PORTAL DASHBOARD ———————————————————————————————————————
    const resident = await prisma.resident.findUnique({
      where: { userId: session.user.id },
      include: {
        user: { select: { name: true } },
        hostel: true,
        room: { select: { roomNumber: true, rentPerBed: true, type: true } },
        bed: {
          include: {
            room: { select: { roomNumber: true } },
          },
        },
      },
    });

    if (!resident) {
      return NextResponse.json({ error: 'Resident not found' }, { status: 404 });
    }

    // Get current month bill
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    let currentBill = null;
    try {
      const bill = await prisma.monthlyBill.findFirst({
        where: {
          residentId: resident.id,
          month: currentMonth,
          year: currentYear,
        },
      });

      if (bill) {
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December',
        ];
        currentBill = {
          id: bill.id,
          amount: bill.totalAmount,
          status: bill.status,
          month: `${monthNames[bill.month - 1]} ${bill.year}`,
          dueDate: bill.dueDate?.toISOString() || null,
        };
      }
    } catch {
      // bill model may not exist yet
    }

    // Get recent notices (last 3)
    const recentNotices = await prisma.notice.findMany({
      where: { hostelId: resident.hostelId },
      include: {
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    const formattedNotices = recentNotices.map((n: any) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      createdAt: n.createdAt.toISOString(),
    }));

    // Get room rent - safely handle missing bed/room
    const roomId = (resident as any).roomId;
    const room = roomId ? await prisma.room.findUnique({
      where: { id: roomId },
      select: { rentPerBed: true, type: true },
    }) : null;

    return NextResponse.json({
      role: 'RESIDENT',
      resident: {
        name: (resident as any).user?.name || 'Unknown',
        roomNumber: resident.bed?.room?.roomNumber || (resident as any).room?.roomNumber || 'N/A',
        bedNumber: resident.bed?.bedNumber || 'N/A',
        hostelName: resident.hostel?.name || 'N/A',
      },
      agreement: {
        moveInDate: (resident as any).moveInDate?.toISOString() || null,
        moveOutDate: (resident as any).moveOutDate?.toISOString() || null,
        advancePaid: (resident as any).advancePaid || 0,
        securityDeposit: (resident as any).securityDeposit || 0,
        monthlyRent: room?.rentPerBed || (resident as any).room?.rentPerBed || 0,
        roomType: room?.type || (resident as any).room?.type || 'N/A',
        status: (resident as any).status || 'ACTIVE',
        foodPlan: (resident as any).foodPlan || 'FULL_MESS',
        customFoodFee: (resident as any).customFoodFee || 0,
      },
      currentBill,
      recentNotices: formattedNotices,
    });
  } catch (error) {
    console.error('Failed to fetch portal dashboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
