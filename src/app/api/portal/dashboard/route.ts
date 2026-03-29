import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'RESIDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resident = await prisma.resident.findUnique({
      where: { userId: session.user.id },
      include: {
        user: { select: { name: true } },
        hostel: true,
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

    // Get room rent
    const room = resident.bed?.room ? await prisma.room.findUnique({
      where: { id: (resident as any).roomId },
      select: { rentPerBed: true, type: true },
    }) : null;

    return NextResponse.json({
      resident: {
        name: (resident as any).user?.name || 'Unknown',
        roomNumber: resident.bed?.room?.roomNumber || 'N/A',
        bedNumber: resident.bed?.bedNumber || 'N/A',
        hostelName: resident.hostel?.name || 'N/A',
      },
      agreement: {
        moveInDate: (resident as any).moveInDate?.toISOString() || null,
        moveOutDate: (resident as any).moveOutDate?.toISOString() || null,
        advancePaid: (resident as any).advancePaid || 0,
        securityDeposit: (resident as any).securityDeposit || 0,
        monthlyRent: room?.rentPerBed || 0,
        roomType: room?.type || 'N/A',
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
