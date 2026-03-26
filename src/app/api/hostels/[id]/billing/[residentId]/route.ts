import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; residentId: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = session.user.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant assigned" }, { status: 403 });
  }

  try {
    const hostel = await prisma.hostel.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!hostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

    const bill = await prisma.monthlyBill.findFirst({
      where: {
        hostelId: params.id,
        residentId: params.residentId,
        month,
        year,
      },
      include: {
        resident: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
            room: {
              select: {
                roomNumber: true,
                type: true,
                floor: {
                  select: {
                    name: true,
                    building: { select: { name: true } },
                  },
                },
              },
            },
            bed: { select: { bedNumber: true } },
          },
        },
        payments: {
          include: {
            recordedBy: { select: { name: true } },
          },
          orderBy: { date: "desc" },
        },
      },
    });

    if (!bill) {
      return NextResponse.json(
        { error: "Bill not found for this month" },
        { status: 404 }
      );
    }

    return NextResponse.json(bill);
  } catch (error) {
    console.error("Get resident bill error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bill detail" },
      { status: 500 }
    );
  }
}
