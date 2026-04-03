import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import PdfPrinter from "pdfmake";
import { TDocumentDefinitions } from "pdfmake/interfaces";

// Resolve font paths from project root — relative strings break in Next.js serverless
const FONTS_DIR = path.join(process.cwd(), "node_modules/pdfmake/build/");

const fonts = {
  Roboto: {
    normal: path.join(FONTS_DIR, "vfs_fonts.js"),
    bold: path.join(FONTS_DIR, "vfs_fonts.js"),
    italics: path.join(FONTS_DIR, "vfs_fonts.js"),
    bolditalics: path.join(FONTS_DIR, "vfs_fonts.js"),
  },
};

function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString("en-PK")}`;
}

function getLogoBase64(logoUrl: string | null | undefined): string | null {
  if (!logoUrl) return null;
  try {
    // logoUrl is like /uploads/images/xxx.jpg
    const filePath = path.join(process.cwd(), "public", logoUrl);
    if (!fs.existsSync(filePath)) return null;
    const ext = path.extname(logoUrl).toLowerCase().replace(".", "");
    const mime = ext === "png" ? "image/png" : "image/jpeg";
    const data = fs.readFileSync(filePath).toString("base64");
    return `data:${mime};base64,${data}`;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Please login to continue" }, { status: 401 });
  }

  const tenantId = session.user.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Your account is not linked to any organization. Please contact support." }, { status: 403 });
  }

  try {
    const hostel = await prisma.hostel.findFirst({
      where: { id: params.id, tenantId },
      include: {
        tenant: { select: { name: true, logo: true } },
      },
    });
    if (!hostel) {
      return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const billId = searchParams.get("billId");
    const paymentId = searchParams.get("paymentId");

    if (!billId) {
      return NextResponse.json(
        { error: "billId is required" },
        { status: 400 }
      );
    }

    const bill = await prisma.monthlyBill.findFirst({
      where: { id: billId, hostelId: params.id },
      include: {
        resident: {
          include: {
            user: { select: { name: true, email: true, phone: true } },
            room: {
              select: {
                roomNumber: true,
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
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];

    const payment = paymentId
      ? bill.payments.find((p) => p.id === paymentId)
      : bill.payments[0];

    const invoiceNumber = `INV-${bill.year}-${String(bill.month).padStart(2, "0")}-${bill.id.slice(-6).toUpperCase()}`;
    const dueDateObj = new Date(bill.year, bill.month, 10); // 10th of next month
    const dueDate = dueDateObj.toLocaleDateString("en-PK");
    const billPeriod = `${monthNames[bill.month - 1]} ${bill.year}`;

    const tenantName = hostel.tenant?.name || "HostelHub";
    const logoBase64 = getLogoBase64(hostel.tenant?.logo);

    const statusColor =
      bill.status === "PAID"
        ? "#16A34A"
        : bill.status === "PARTIAL"
        ? "#D97706"
        : "#DC2626";

    // Build header columns: logo + tenant name on left, INVOICE label on right
    const headerLeftStack: object[] = [];
    if (logoBase64) {
      headerLeftStack.push({
        image: logoBase64,
        width: 48,
        height: 48,
        margin: [0, 0, 0, 6],
      });
    }
    headerLeftStack.push({ text: tenantName, style: "header" });
    headerLeftStack.push({ text: hostel.name, style: "hostelName", margin: [0, 2, 0, 0] });
    if (hostel.address) {
      headerLeftStack.push({ text: hostel.address, style: "hostelAddress", margin: [0, 2, 0, 0] });
    }

    const docDefinition: TDocumentDefinitions = {
      pageSize: "A4",
      pageMargins: [40, 40, 40, 40],
      content: [
        // ── Header ──────────────────────────────────────────────────────────
        {
          columns: [
            { width: "*", stack: headerLeftStack },
            {
              width: "auto",
              alignment: "right",
              stack: [
                { text: "INVOICE", style: "invoiceTitle" },
                { text: invoiceNumber, style: "invoiceNumber", margin: [0, 4, 0, 0] },
                {
                  text: `Period: ${billPeriod}`,
                  style: "smallText",
                  alignment: "right",
                  margin: [0, 8, 0, 0],
                },
                {
                  text: `Due Date: ${dueDate}`,
                  style: "dueDate",
                  alignment: "right",
                  margin: [0, 4, 0, 0],
                },
                {
                  text: bill.status,
                  style: "statusBadge",
                  color: statusColor,
                  alignment: "right",
                  margin: [0, 8, 0, 0],
                },
              ],
            },
          ],
        },
        // ── Divider ─────────────────────────────────────────────────────────
        {
          canvas: [{ type: "line", x1: 0, y1: 10, x2: 515, y2: 10, lineWidth: 1.5, lineColor: "#0D9488" }],
          margin: [0, 12, 0, 12],
        },
        // ── Billed To + Payment Info ─────────────────────────────────────────
        {
          columns: [
            {
              width: "*",
              stack: [
                { text: "Billed To:", style: "sectionLabel" },
                { text: bill.resident.user.name, style: "residentName", margin: [0, 4, 0, 0] },
                {
                  text: `Room ${bill.resident.room.roomNumber} — Bed ${bill.resident.bed.bedNumber}`,
                  style: "smallText",
                  margin: [0, 2, 0, 0],
                },
                {
                  text: `${bill.resident.room.floor.building.name}, ${bill.resident.room.floor.name}`,
                  style: "smallText",
                  margin: [0, 2, 0, 0],
                },
                ...(bill.resident.user.phone
                  ? [{ text: bill.resident.user.phone, style: "smallText" as const, margin: [0, 2, 0, 0] as [number, number, number, number] }]
                  : []),
              ],
            },
            ...(payment
              ? [
                  {
                    width: "auto" as const,
                    stack: [
                      { text: "Payment Details:", style: "sectionLabel" as const, alignment: "right" as const },
                      {
                        text: `Receipt #: ${payment.receiptNumber || "N/A"}`,
                        style: "smallText" as const,
                        alignment: "right" as const,
                        margin: [0, 4, 0, 0] as [number, number, number, number],
                      },
                      {
                        text: `Date: ${new Date(payment.date).toLocaleDateString("en-PK")}`,
                        style: "smallText" as const,
                        alignment: "right" as const,
                        margin: [0, 2, 0, 0] as [number, number, number, number],
                      },
                      {
                        text: `Method: ${payment.method}`,
                        style: "smallText" as const,
                        alignment: "right" as const,
                        margin: [0, 2, 0, 0] as [number, number, number, number],
                      },
                      ...(payment.recordedBy
                        ? [{
                            text: `Recorded by: ${payment.recordedBy.name}`,
                            style: "smallText" as const,
                            alignment: "right" as const,
                            margin: [0, 2, 0, 0] as [number, number, number, number],
                          }]
                        : []),
                    ],
                  },
                ]
              : []),
          ],
        },
        // ── Charges Table ────────────────────────────────────────────────────
        {
          margin: [0, 20, 0, 0],
          table: {
            headerRows: 1,
            widths: ["*", "auto"],
            body: [
              [
                { text: "Description", style: "tableHeader" },
                { text: "Amount", style: "tableHeader", alignment: "right" },
              ],
              ...(bill.roomRent > 0 ? [["Room Rent", { text: formatPKR(bill.roomRent), alignment: "right" }]] : []),
              ...(bill.foodCharges > 0 ? [["Food Charges", { text: formatPKR(bill.foodCharges), alignment: "right" }]] : []),
              ...(bill.parkingFee > 0 ? [["Parking Fee", { text: formatPKR(bill.parkingFee), alignment: "right" }]] : []),
              ...(bill.meterCharges > 0 ? [["Electricity / Meter Charges", { text: formatPKR(bill.meterCharges), alignment: "right" }]] : []),
              ...(bill.otherCharges > 0 ? [["Other Charges", { text: formatPKR(bill.otherCharges), alignment: "right" }]] : []),
              ...(bill.previousBalance > 0 ? [["Previous Balance (Carried Forward)", { text: formatPKR(bill.previousBalance), alignment: "right" }]] : []),
              ...(bill.advanceDeduction > 0
                ? [[
                    { text: "Advance Deduction", color: "#16A34A" },
                    { text: `- ${formatPKR(bill.advanceDeduction)}`, alignment: "right", color: "#16A34A" },
                  ]]
                : []),
              [
                { text: "Total Amount", bold: true, fontSize: 11 },
                { text: formatPKR(bill.totalAmount), bold: true, alignment: "right", fontSize: 11 },
              ],
              [
                { text: "Amount Paid", bold: true, color: "#16A34A" },
                { text: formatPKR(bill.paidAmount), bold: true, color: "#16A34A", alignment: "right" },
              ],
              [
                { text: "Balance Due", bold: true, color: bill.balance > 0 ? "#DC2626" : "#16A34A", fontSize: 12 },
                { text: formatPKR(bill.balance), bold: true, color: bill.balance > 0 ? "#DC2626" : "#16A34A", alignment: "right", fontSize: 12 },
              ],
            ],
          },
          layout: {
            hLineWidth: (i: number, node: any) =>
              i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5,
            vLineWidth: () => 0,
            hLineColor: (i: number, node: any) =>
              i === 0 || i === node.table.body.length ? "#0D9488" : "#E2E8F0",
            paddingTop: () => 8,
            paddingBottom: () => 8,
          },
        },
        // ── Payment History ──────────────────────────────────────────────────
        ...(bill.payments.length > 0
          ? [
              {
                text: "Payment History",
                style: "sectionLabel" as const,
                margin: [0, 24, 0, 8] as [number, number, number, number],
              },
              {
                table: {
                  headerRows: 1,
                  widths: ["auto", "*", "auto", "auto"],
                  body: [
                    [
                      { text: "Date", style: "tableHeader" },
                      { text: "Receipt #", style: "tableHeader" },
                      { text: "Method", style: "tableHeader" },
                      { text: "Amount", style: "tableHeader", alignment: "right" },
                    ],
                    ...bill.payments.map((p) => [
                      new Date(p.date).toLocaleDateString("en-PK"),
                      p.receiptNumber || "N/A",
                      p.method,
                      { text: formatPKR(p.amount), alignment: "right" },
                    ]),
                  ],
                },
                layout: {
                  hLineWidth: (i: number, node: any) =>
                    i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5,
                  vLineWidth: () => 0,
                  hLineColor: () => "#E2E8F0",
                  paddingTop: () => 6,
                  paddingBottom: () => 6,
                },
              },
            ]
          : []),
        // ── Footer ──────────────────────────────────────────────────────────
        {
          canvas: [{ type: "line", x1: 0, y1: 10, x2: 515, y2: 10, lineWidth: 1, lineColor: "#E2E8F0" }],
          margin: [0, 24, 0, 10],
        },
        {
          text: "This is a computer-generated invoice and does not require a signature.",
          style: "footer",
          alignment: "center",
        },
        {
          text: `Generated on ${new Date().toLocaleDateString("en-PK")} · ${tenantName} — ${hostel.name}`,
          style: "footer",
          alignment: "center",
          margin: [0, 4, 0, 0],
        },
      ],
      styles: {
        header: {
          fontSize: 22,
          bold: true,
          color: "#0D9488",
        },
        invoiceTitle: {
          fontSize: 20,
          bold: true,
          color: "#0D9488",
          alignment: "right",
        },
        invoiceNumber: {
          fontSize: 10,
          color: "#64748B",
          alignment: "right",
        },
        dueDate: {
          fontSize: 10,
          bold: true,
          color: "#DC2626",
        },
        statusBadge: {
          fontSize: 11,
          bold: true,
        },
        hostelName: {
          fontSize: 12,
          bold: true,
          color: "#1E293B",
        },
        hostelAddress: {
          fontSize: 10,
          color: "#64748B",
        },
        sectionLabel: {
          fontSize: 10,
          bold: true,
          color: "#64748B",
        },
        residentName: {
          fontSize: 14,
          bold: true,
          color: "#1E293B",
        },
        smallText: {
          fontSize: 10,
          color: "#475569",
        },
        tableHeader: {
          fontSize: 10,
          bold: true,
          color: "#0F766E",
          fillColor: "#F0FDFA",
        },
        footer: {
          fontSize: 9,
          color: "#94A3B8",
          italics: true,
        },
      },
    };

    const printer = new PdfPrinter(fonts);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    const chunks: Buffer[] = [];
    return new Promise<NextResponse>((resolve, reject) => {
      pdfDoc.on("data", (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on("end", () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(
          new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="invoice-${bill.month}-${bill.year}-${bill.resident.user.name.replace(/\s+/g, "_")}.pdf"`,
            },
          })
        );
      });
      pdfDoc.on("error", reject);
      pdfDoc.end();
    });
  } catch (error) {
    console.error("Generate receipt error:", error);
    return NextResponse.json(
      { error: "Failed to generate receipt" },
      { status: 500 }
    );
  }
}
