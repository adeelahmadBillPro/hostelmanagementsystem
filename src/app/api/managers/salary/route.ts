import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateMonthYear } from "@/lib/validate";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== "TENANT_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

    const salaries = await prisma.managerSalary.findMany({
      where: { user: { tenantId: session.user.tenantId! }, month, year },
      include: { user: { select: { id: true, name: true, email: true, salary: true } } },
      orderBy: { createdAt: "desc" },
    });

    const totalBase = salaries.reduce((s, r) => s + r.amount, 0);
    const totalBonus = salaries.reduce((s, r) => s + r.bonus, 0);
    const totalDeductions = salaries.reduce((s, r) => s + r.deduction, 0);
    const totalNet = salaries.reduce((s, r) => s + r.netAmount, 0);
    const paidCount = salaries.filter((r) => r.isPaid).length;

    return NextResponse.json({
      salaries,
      stats: { totalBase, totalBonus, totalDeductions, totalNet, paidCount, unpaidCount: salaries.length - paidCount },
    });
  } catch (error) {
    console.error("Get manager salaries error:", error);
    return NextResponse.json({ error: "Failed to fetch salaries" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== "TENANT_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { month, year } = await request.json();
    const myCheck = validateMonthYear(month, year);
    if (!myCheck.valid) return NextResponse.json({ error: myCheck.error }, { status: 400 });

    const managers = await prisma.user.findMany({
      where: { tenantId: session.user.tenantId!, role: "HOSTEL_MANAGER" },
      select: { id: true, name: true, salary: true },
    });

    if (managers.length === 0) {
      return NextResponse.json({ error: "No managers found" }, { status: 400 });
    }

    const existing = await prisma.managerSalary.findMany({
      where: { userId: { in: managers.map((m) => m.id) }, month, year },
      select: { userId: true },
    });
    const existingIds = new Set(existing.map((e) => e.userId));
    const newManagers = managers.filter((m) => !existingIds.has(m.id));

    if (newManagers.length === 0) {
      return NextResponse.json({ message: "Salary sheet already generated for all managers", count: 0 });
    }

    await prisma.managerSalary.createMany({
      data: newManagers.map((m) => ({
        userId: m.id,
        month,
        year,
        amount: m.salary || 0,
        bonus: 0,
        deduction: 0,
        netAmount: m.salary || 0,
      })),
    });

    return NextResponse.json({ message: `Generated salary for ${newManagers.length} manager(s)`, count: newManagers.length });
  } catch (error) {
    console.error("Generate manager salary error:", error);
    return NextResponse.json({ error: "Failed to generate salary sheet" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== "TENANT_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { recordId, isPaid, bonus, deduction, method, notes } = await request.json();

    if (!recordId) return NextResponse.json({ error: "Record ID required" }, { status: 400 });

    const record = await prisma.managerSalary.findUnique({ where: { id: recordId } });
    if (!record) return NextResponse.json({ error: "Record not found" }, { status: 404 });

    const newBonus = bonus !== undefined ? parseFloat(bonus) || 0 : record.bonus;
    const newDeduction = deduction !== undefined ? parseFloat(deduction) || 0 : record.deduction;
    const netAmount = record.amount + newBonus - newDeduction;

    await prisma.managerSalary.update({
      where: { id: recordId },
      data: {
        bonus: newBonus,
        deduction: newDeduction,
        netAmount: Math.max(0, netAmount),
        isPaid: isPaid !== undefined ? isPaid : record.isPaid,
        paidDate: isPaid ? new Date() : record.paidDate,
        method: method || record.method,
        notes: notes || record.notes,
      },
    });

    return NextResponse.json({ message: "Updated successfully" });
  } catch (error) {
    console.error("Update manager salary error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== "TENANT_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { month, year } = await request.json();

    await prisma.managerSalary.updateMany({
      where: { user: { tenantId: session.user.tenantId! }, month, year, isPaid: false },
      data: { isPaid: true, paidDate: new Date() },
    });

    return NextResponse.json({ message: "All salaries marked as paid" });
  } catch (error) {
    console.error("Mark all paid error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
