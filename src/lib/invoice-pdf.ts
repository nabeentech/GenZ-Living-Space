import PDFDocument from "pdfkit";

function formatINR(amount: number) {
  return `Rs. ${amount.toLocaleString("en-IN")}`;
}

function formatDate(value: Date) {
  return value.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function createInvoicePdf({ booking, invoice }: { booking: any; invoice: any }) {
  const document = new PDFDocument({ size: "A4", margin: 48 });
  const chunks: Buffer[] = [];

  document.on("data", (chunk) => chunks.push(Buffer.from(chunk)));

  document.fontSize(22).fillColor("#312e81").text("GenZ Living Space", { continued: true });
  document.fontSize(10).fillColor("#64748b").text("  |  Official Tax Invoice");
  document.moveDown(0.5);
  document.strokeColor("#cbd5e1").moveTo(48, document.y).lineTo(547, document.y).stroke();
  document.moveDown(1.2);

  document.fontSize(10).fillColor("#64748b").text("Invoice Number");
  document.fontSize(13).fillColor("#0f172a").text(invoice?.invoiceNumber || "Pending");
  document.fontSize(10).fillColor("#64748b").text(`Issue Date: ${formatDate(invoice?.issueDate || new Date())}`);
  document.moveDown(1);

  document.fontSize(11).fillColor("#312e81").text("Billed To");
  document.fontSize(12).fillColor("#0f172a").text(booking.guestName);
  document.fontSize(10).fillColor("#475569").text(booking.guestEmail);
  document.text(booking.guestPhone);
  document.moveDown(1);

  document.fontSize(11).fillColor("#312e81").text("Stay Details");
  document.fontSize(10).fillColor("#475569").text(`Booking: ${booking.bookingReference}`);
  document.text(`Property: ${booking.hostel.name}, ${booking.hostel.city}`);
  document.text(`Room / Bed: ${booking.room.roomNumber} / ${booking.bed.bedNumber}`);
  document.text(`Stay: ${formatDate(booking.checkInDate)} to ${formatDate(booking.checkOutDate)}`);
  document.moveDown(1.2);

  const rows = [
    ["Accommodation", booking.baseAmount],
    ["GST", booking.taxAmount],
    ["Service Fee", booking.serviceFee],
    ["Security Deposit", booking.securityDeposit],
    ["Discount", -booking.discountAmount],
  ].filter(([, amount]) => amount !== 0);

  document.fontSize(11).fillColor("#312e81").text("Amount Breakdown");
  document.moveDown(0.35);
  rows.forEach(([label, amount]) => {
    document.fontSize(10).fillColor("#475569").text(String(label), 70, document.y, { continued: true, width: 300 });
    document.fillColor("#0f172a").text(formatINR(Number(amount)), { align: "right" });
    document.moveDown(0.25);
  });

  document.moveDown(0.5);
  document.strokeColor("#cbd5e1").moveTo(48, document.y).lineTo(547, document.y).stroke();
  document.moveDown(0.5);
  document.fontSize(15).fillColor("#0f172a").text("Total Paid", 70, document.y, { continued: true, width: 300 });
  document.fillColor("#059669").text(formatINR(booking.paidAmount), { align: "right" });
  document.moveDown(1.5);

  document.fontSize(9).fillColor("#64748b").text("Thank you for staying with GenZ Living Space.");
  document.text("This is a computer-generated invoice and does not require a signature.");

  document.end();

  return new Promise<Buffer>((resolve) => {
    document.on("end", () => resolve(Buffer.concat(chunks)));
  });
}
