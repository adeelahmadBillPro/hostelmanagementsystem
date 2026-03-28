import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hostelId = params.id;
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");

    if (!dateStr) {
      return NextResponse.json({ error: "Date parameter is required" }, { status: 400 });
    }

    // Parse date and create start/end of day range
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    // Fetch all active staff for this hostel
    const staff = await prisma.staff.findMany({
      where: { hostelId, isActive: true },
      orderBy: { name: "asc" },
    });

    // Fetch attendance records for the given date
    const attendance = await prisma.staffAttendance.findMany({
      where: {
        hostelId,
        date: {
          gte: date,
          lt: nextDay,
        },
      },
    });

    // Map attendance by staffId for quick lookup
    const attendanceMap: Record<string, any> = {};
    attendance.forEach((record) => {
      attendanceMap[record.staffId] = record;
    });

    // Combine staff with their attendance
    const staffWithAttendance = staff.map((s) => {
      const att = attendanceMap[s.id];
      return {
        id: s.id,
        name: s.name,
        staffType: s.staffType,
        shift: s.shift,
        phone: s.phone,
        photo: s.photo,
        attendance: att
          ? {
              id: att.id,
              status: att.status,
              checkIn: att.checkIn,
              checkOut: att.checkOut,
              notes: att.notes,
            }
          : null,
      };
    });

    return NextResponse.json({ staff: staffWithAttendance, date: dateStr });
  } catch (error) {
    console.error("Failed to fetch attendance:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hostelId = params.id;
    const body = await request.json();
    const { date, records } = body;

    if (!date || !records || !Array.isArray(records)) {
      return NextResponse.json(
        { error: "Date and records array are required" },
        { status: 400 }
      );
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const validStatuses = ["PRESENT", "ABSENT", "LATE", "HALF_DAY", "LEAVE"];

    // Validate records
    for (const record of records) {
      if (!record.staffId || !record.status) {
        return NextResponse.json(
          { error: "Each record must have staffId and status" },
          { status: 400 }
        );
      }
      if (!validStatuses.includes(record.status)) {
        return NextResponse.json(
          { error: `Invalid status: ${record.status}` },
          { status: 400 }
        );
      }
    }

    // Upsert each attendance record
    const results = await Promise.all(
      records.map((record: any) =>
        prisma.staffAttendance.upsert({
          where: {
            staffId_date: {
              staffId: record.staffId,
              date: attendanceDate,
            },
          },
          update: {
            status: record.status,
            checkIn: record.checkIn || null,
            checkOut: record.checkOut || null,
            notes: record.notes || null,
          },
          create: {
            staffId: record.staffId,
            hostelId,
            date: attendanceDate,
            status: record.status,
            checkIn: record.checkIn || null,
            checkOut: record.checkOut || null,
            notes: record.notes || null,
          },
        })
      )
    );

    return NextResponse.json({
      message: `Attendance saved for ${results.length} staff members`,
      count: results.length,
    });
  } catch (error) {
    console.error("Failed to save attendance:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
