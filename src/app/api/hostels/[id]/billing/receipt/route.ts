import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import PdfPrinter from "pdfmake";
import { TDocumentDefinitions } from "pdfmake/interfaces";

const fonts = {
  Roboto: {
    normal: "node_modules/pdfmake/build/vfs_fonts.js",
    bold: "node_modules/pdfmake/build/vfs_fonts.js",
    italics: "node_modules/pdfmake/build/vfs_fonts.js",
    bolditalics: "node_modules/pdfmake/build/vfs_fonts.js",
  },
};

function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString("en-PK")}`;
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

    const docDefinition: TDocumentDefinitions = {
      pageSize: "A4",
      pageMargins: [40, 40, 40, 40],
      content: [
        {
          columns: [
            {
              text: "HostelHub",
              style: "header",
              width: "*",
            },
            {
              text: "PAYMENT RECEIPT",
              style: "receiptTitle",
              width: "auto",
              alignment: "right",
            },
          ],
        },
        {
          text: hostel.name,
          style: "hostelName",
          margin: [0, 2, 0, 0],
        },
        {
          text: hostel.address,
          style: "hostelAddress",
          margin: [0, 2, 0, 0],
        },
        {
          canvas: [
            {
              type: "line",
              x1: 0,
              y1: 10,
              x2: 515,
              y2: 10,
              lineWidth: 1,
              lineColor: "#E2E8F0",
            },
          ],
          margin: [0, 10, 0, 10],
        },
        {
          columns: [
            {
              width: "*",
              stack: [
                { text: "Billed To:", style: "sectionLabel" },
                {
                  text: bill.resident.user.name,
                  style: "residentName",
                  margin: [0, 4, 0, 0],
                },
                {
                  text: `Room ${bill.resident.room.roomNumber} - Bed ${bill.resident.bed.bedNumber}`,
                  style: "smallText",
                  margin: [0, 2, 0, 0],
                },
                {
                  text: `${bill.resident.room.floor.building.name}, ${bill.resident.room.floor.name}`,
                  style: "smallText",
                  margin: [0, 2, 0, 0],
                },
                ...(bill.resident.user.phone
                  ? [
                      {
                        text: bill.resident.user.phone,
                        style: "smallText" as const,
                        margin: [0, 2, 0, 0] as [number, number, number, number],
                      },
                    ]
                  : []),
              ],
            },
            {
              width: "auto",
              stack: [
                {
                  text: `Bill Period: ${monthNames[bill.month - 1]} ${bill.year}`,
                  style: "smallText",
                  alignment: "right",
                },
                ...(payment
                  ? [
                      {
                        text: `Receipt #: ${payment.receiptNumber || "N/A"}`,
                        style: "smallText" as const,
                        alignment: "right" as const,
                        margin: [0, 4, 0, 0] as [number, number, number, number],
                      },
                      {
                        text: `Payment Date: ${new Date(payment.date).toLocaleDateString("en-PK")}`,
                        style: "smallText" as const,
                        alignment: "right" as const,
                        margin: [0, 4, 0, 0] as [number, number, number, number],
                      },
                      {
                        text: `Method: ${payment.method}`,
                        style: "smallText" as const,
                        alignment: "right" as const,
                        margin: [0, 4, 0, 0] as [number, number, number, number],
                      },
                    ]
                  : []),
              ],
            },
          ],
        },
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
              ["Room Rent", { text: formatPKR(bill.roomRent), alignment: "right" }],
              ["Food Charges", { text: formatPKR(bill.foodCharges), alignment: "right" }],
              ["Parking Fee", { text: formatPKR(bill.parkingFee), alignment: "right" }],
              ["Meter Charges", { text: formatPKR(bill.meterCharges), alignment: "right" }],
              ["Other Charges", { text: formatPKR(bill.otherCharges), alignment: "right" }],
              ["Previous Balance", { text: formatPKR(bill.previousBalance), alignment: "right" }],
              [
                "Advance Deduction",
                { text: `- ${formatPKR(bill.advanceDeduction)}`, alignment: "right" },
              ],
              [
                { text: "Total Amount", bold: true },
                { text: formatPKR(bill.totalAmount), bold: true, alignment: "right" },
              ],
              [
                { text: "Paid Amount", bold: true, color: "#16A34A" },
                {
                  text: formatPKR(bill.paidAmount),
                  bold: true,
                  color: "#16A34A",
                  alignment: "right",
                },
              ],
              [
                { text: "Remaining Balance", bold: true, color: "#DC2626" },
                {
                  text: formatPKR(bill.balance),
                  bold: true,
                  color: "#DC2626",
                  alignment: "right",
                },
              ],
            ],
          },
          layout: {
            hLineWidth: (i: number, node: any) =>
              i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5,
            vLineWidth: () => 0,
            hLineColor: () => "#E2E8F0",
            paddingTop: () => 8,
            paddingBottom: () => 8,
          },
        },
        ...(bill.payments.length > 0
          ? [
              {
                text: "Payment History",
                style: "sectionLabel" as const,
                margin: [0, 20, 0, 8] as [number, number, number, number],
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
        {
          text: `Status: ${bill.status}`,
          style: "status",
          margin: [0, 20, 0, 0],
        },
        {
          canvas: [
            {
              type: "line",
              x1: 0,
              y1: 10,
              x2: 515,
              y2: 10,
              lineWidth: 1,
              lineColor: "#E2E8F0",
            },
          ],
          margin: [0, 20, 0, 10],
        },
        {
          text: "This is a computer-generated receipt and does not require a signature.",
          style: "footer",
          alignment: "center",
        },
        {
          text: `Generated on ${new Date().toLocaleDateString("en-PK")} by HostelHub`,
          style: "footer",
          alignment: "center",
          margin: [0, 4, 0, 0],
        },
      ],
      styles: {
        header: {
          fontSize: 22,
          bold: true,
          color: "#4F46E5",
        },
        receiptTitle: {
          fontSize: 14,
          bold: true,
          color: "#64748B",
        },
        hostelName: {
          fontSize: 12,
          color: "#334155",
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
          fontSize: 13,
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
          color: "#475569",
        },
        status: {
          fontSize: 12,
          bold: true,
          color:
            bill.status === "PAID"
              ? "#16A34A"
              : bill.status === "PARTIAL"
              ? "#D97706"
              : "#DC2626",
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
              "Content-Disposition": `attachment; filename="receipt-${bill.month}-${bill.year}-${bill.resident.user.name.replace(/\s+/g, "_")}.pdf"`,
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
