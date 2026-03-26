import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; noticeId: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.content !== undefined) updateData.content = body.content;

    const notice = await prisma.notice.update({
      where: { id: params.noticeId, hostelId: params.id },
      data: updateData,
    });

    return NextResponse.json({ notice });
  } catch (error) {
    console.error('Failed to update notice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; noticeId: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.notice.delete({
      where: { id: params.noticeId, hostelId: params.id },
    });

    return NextResponse.json({ message: 'Notice deleted successfully' });
  } catch (error) {
    console.error('Failed to delete notice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
