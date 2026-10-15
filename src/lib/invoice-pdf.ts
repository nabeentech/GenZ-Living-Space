import PDFDocument from "pdfkit";
import QRCode from "qrcode";

function formatINR(amount: number) {
  const rounded = Math.round((Number(amount) || 0) * 100) / 100;
  return `Rs. ${rounded.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "N/A";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStayDurationText(checkIn: Date | string, checkOut: Date | string, isOpenEnded: boolean) {
  if (isOpenEnded) return "Monthly Open-Ended Stay";
  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();
  if (isNaN(start) || isNaN(end) || end <= start) return "1 Night";
  const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24));
  if (diffDays >= 30) {
    const months = Math.floor(diffDays / 30);
    const remDays = diffDays % 30;
    return remDays > 0 ? `${months} Mo, ${remDays} Days (${diffDays} Nights)` : `${months} Month (${diffDays} Nights)`;
  }
  return `${diffDays} Night${diffDays > 1 ? "s" : ""}`;
}

export async function createInvoicePdf({ booking, invoice }: { booking: any; invoice: any }): Promise<Buffer> {
  const document = new PDFDocument({
    size: "A4",
    margin: 36,
    info: {
      Title: `Tax Invoice - ${invoice?.invoiceNumber || booking?.bookingReference || ""}`,
      Author: "GenZ Living Space - GenZ Colive PG and Guest Rooms",
      Subject: "Official Tax Invoice & Accommodation Check-In Pass",
      Creator: "GenZ Living Space Platform",
    },
  });

  const chunks: Buffer[] = [];
  document.on("data", (chunk) => chunks.push(Buffer.from(chunk)));

  // 0. GENERATE QR CODE BUFFER
  let qrBuffer: Buffer | null = null;
  try {
    const qrPayload = JSON.stringify({
      ref: booking.bookingReference,
      inv: invoice?.invoiceNumber || `GZ-${booking.bookingReference}`,
      guest: booking.guestName,
      bed: `${booking.room?.roomNumber || "R"}-${booking.bed?.bedNumber || "B"}`,
      status: "PAID",
      date: new Date().toISOString(),
    });
    qrBuffer = await QRCode.toBuffer(qrPayload, {
      type: "png",
      width: 240,
      margin: 1,
      color: {
        dark: "#1e1b4b",
        light: "#ffffff",
      },
    });
  } catch (err) {
    console.error("QR Generation error in Invoice PDF:", err);
  }

  // 1. TOP COLOR ACCENT STRIPS
  document.save();
  document.rect(0, 0, 595.28, 6).fill("#312e81"); // Deep Indigo
  document.rect(0, 6, 595.28, 3).fill("#06b6d4"); // Cyan
  document.restore();

  // 2. HEADER: BRAND & LEGAL CREDENTIALS (LEFT: X: 36 to 340)
  document.save();
  document.roundedRect(36, 26, 38, 38, 8).fill("#312e81");
  document.font("Helvetica-Bold").fontSize(15).fillColor("#ffffff").text("GZ", 36, 37, { width: 38, align: "center" });
  document.restore();

  // Brand Name & Subtitle
  document.font("Helvetica-Bold").fontSize(17).fillColor("#0f172a").text("GenZ Living Space", 84, 25);
  document.font("Helvetica-Bold").fontSize(8.5).fillColor("#4f46e5").text("GenZ Colive PG and Guest Rooms", 84, 45);

  // Business Credentials (constrained to width 275 so no collision with right metadata)
  document.font("Helvetica").fontSize(7).fillColor("#475569").text("Owner: KANDULA VEERAIAH   •   FSSAI Reg No: 23626028006147", 84, 59, { width: 275 });
  document.font("Helvetica").fontSize(7).fillColor("#64748b").text(
    "Madhapur - HYD, Telangana, India   •   Phone: +91 96520 37700",
    84,
    70,
    { width: 275 }
  );
  document.font("Helvetica").fontSize(7).fillColor("#64748b").text(
    "Email: genzlivingspace@gmail.com   •   Web: www.genzlivingspace.com",
    84,
    81,
    { width: 275 }
  );

  // HEADER: TAX INVOICE METADATA (RIGHT: X: 380 to 559)
  document.font("Helvetica-Bold").fontSize(17).fillColor("#0f172a").text("TAX INVOICE", 380, 25, { width: 179, align: "right" });

  // Paid Status Pill
  document.save();
  document.roundedRect(475, 46, 84, 16, 8).fillAndStroke("#ecfdf5", "#a7f3d0");
  document.font("Helvetica-Bold").fontSize(7.5).fillColor("#047857").text("PAID IN FULL", 475, 50, { width: 84, align: "center" });
  document.restore();

  // Metadata items
  const metaY = 66;
  document.font("Helvetica-Bold").fontSize(7.5).fillColor("#475569").text("Invoice No:", 375, metaY, { width: 75, align: "right" });
  document.font("Helvetica-Bold").fontSize(7.5).fillColor("#0f172a").text(invoice?.invoiceNumber || `GZ-${booking.bookingReference}`, 455, metaY, { width: 104, align: "right" });

  document.font("Helvetica-Bold").fontSize(7.5).fillColor("#475569").text("Booking Ref:", 375, metaY + 11, { width: 75, align: "right" });
  document.font("Helvetica-Bold").fontSize(7.5).fillColor("#4338ca").text(booking.bookingReference, 455, metaY + 11, { width: 104, align: "right" });

  document.font("Helvetica-Bold").fontSize(7.5).fillColor("#475569").text("Date of Issue:", 375, metaY + 22, { width: 75, align: "right" });
  document.font("Helvetica").fontSize(7.5).fillColor("#334155").text(formatDate(invoice?.issueDate || booking.createdAt), 455, metaY + 22, { width: 104, align: "right" });

  // 3. DIVIDER LINE
  document.save();
  document.strokeColor("#e2e8f0").lineWidth(1).moveTo(36, 102).lineTo(559, 102).stroke();
  document.restore();

  // 4. DUAL CARDS: GUEST DETAILS & PROPERTY RESERVATION (Y: 110 to 198, H: 88)
  // Left Card: Billed To
  document.save();
  document.roundedRect(36, 110, 255, 88, 8).fillAndStroke("#f8fafc", "#e2e8f0");
  document.restore();

  document.font("Helvetica-Bold").fontSize(7).fillColor("#4f46e5").text("BILLED TO / GUEST DETAILS", 46, 118);
  document.font("Helvetica-Bold").fontSize(9.5).fillColor("#0f172a").text(booking.guestName || "Guest", 46, 128, { width: 235 });
  document.font("Helvetica").fontSize(7.5).fillColor("#475569").text(`Email: ${booking.guestEmail || "N/A"}`, 46, 140, { width: 235 });
  document.font("Helvetica").fontSize(7.5).fillColor("#475569").text(`Phone: ${booking.guestPhone || "N/A"}`, 46, 152, { width: 235 });
  document.font("Helvetica").fontSize(7.2).fillColor("#64748b").text(
    booking.guestGovtId ? `Govt ID: ${booking.guestGovtId}` : "Identity: Verified at Reception Desk",
    46,
    164,
    { width: 235 }
  );
  document.font("Helvetica-Bold").fontSize(7).fillColor("#4338ca").text(
    `${booking.guestsCount || 1} Guest(s)   •   Resident Pass Confirmed`,
    46,
    176,
    { width: 235 }
  );

  // Right Card: Property & Stay Details
  document.save();
  document.roundedRect(304, 110, 255, 88, 8).fillAndStroke("#f8fafc", "#e2e8f0");
  document.restore();

  document.font("Helvetica-Bold").fontSize(7).fillColor("#4f46e5").text("PROPERTY & RESERVATION DETAILS", 314, 118);
  document.font("Helvetica-Bold").fontSize(9).fillColor("#0f172a").text(
    booking.hostel?.name || "GenZ Colive PG and Guest Rooms",
    314,
    128,
    { width: 235 }
  );

  document.font("Helvetica").fontSize(7.2).fillColor("#64748b").text(
    `Location: ${booking.hostel?.city || "Madhapur, Hyderabad"}`,
    314,
    140,
    { width: 235 }
  );

  const roomTypeLabel = booking.room?.roomType?.name ? ` (${booking.room.roomType.name})` : "";
  document.font("Helvetica").fontSize(7.5).fillColor("#334155").text(
    `Room ${booking.room?.roomNumber || "N/A"}${roomTypeLabel}   •   Bed ${booking.bed?.bedNumber || "N/A"}`,
    314,
    152,
    { width: 235 }
  );

  const checkOutStr = booking.isOpenEnded ? "Ongoing (Monthly)" : formatDate(booking.checkOutDate);
  document.font("Helvetica").fontSize(7.5).fillColor("#475569").text(
    `Stay: ${formatDate(booking.checkInDate)} to ${checkOutStr}`,
    314,
    164,
    { width: 235 }
  );

  const stayDuration = getStayDurationText(booking.checkInDate, booking.checkOutDate, booking.isOpenEnded);
  document.font("Helvetica-Bold").fontSize(7.2).fillColor("#059669").text(
    `${stayDuration}   •   ${booking.stayType || "DAILY"} Accommodation Plan`,
    314,
    176,
    { width: 235 }
  );

  // 5. ITEMIZED CHARGES TABLE (Y: 204)
  const tableY = 204;
  document.save();
  document.roundedRect(36, tableY, 523, 22, 4).fill("#1e1b4b");
  document.restore();

  document.font("Helvetica-Bold").fontSize(7.5).fillColor("#ffffff").text("ITEM & SERVICE DESCRIPTION", 48, tableY + 6);
  document.text("PLAN / DURATION", 270, tableY + 6, { width: 85, align: "center" });
  document.text("TYPE / SAC", 365, tableY + 6, { width: 70, align: "center" });
  document.text("AMOUNT (INR)", 445, tableY + 6, { width: 102, align: "right" });

  // Rows Data
  const rows: Array<{
    name: string;
    sub: string;
    plan: string;
    type: string;
    amount: number;
    isDiscount?: boolean;
  }> = [];

  rows.push({
    name: "Accommodation Charges",
    sub: `${booking.stayType || "Standard"} Co-living Bed Stay (${stayDuration})`,
    plan: `${booking.stayType || "DAILY"}`,
    type: "SAC 9963",
    amount: booking.baseAmount || 0,
  });

  if (booking.taxAmount && booking.taxAmount > 0) {
    rows.push({
      name: "Goods & Services Tax (GST 12%)",
      sub: "Hospitality Services (CGST 6% + SGST 6%)",
      plan: "12% GST",
      type: "Tax",
      amount: booking.taxAmount,
    });
  }

  if (booking.serviceFee && booking.serviceFee > 0) {
    const isMonthly = booking.stayType === "MONTHLY";
    rows.push({
      name: isMonthly ? "Community & Maintenance Fee" : "Service & Platform Fee",
      sub: isMonthly ? "High-speed Wi-Fi, Housekeeping, Power Backup" : "Standard Facilities & Booking Support",
      plan: "Fixed",
      type: "Fee",
      amount: booking.serviceFee,
    });
  }

  if (booking.securityDeposit && booking.securityDeposit > 0) {
    rows.push({
      name: "Security Deposit (Refundable)",
      sub: "Refundable on check-out inspection & keycard return",
      plan: "Deposit",
      type: "Refundable",
      amount: booking.securityDeposit,
    });
  }

  if (booking.extraGuestCharges && booking.extraGuestCharges > 0) {
    rows.push({
      name: "Extra Guest Accommodation Charges",
      sub: "Authorized additional guest occupant fee",
      plan: "Addon",
      type: "Charge",
      amount: booking.extraGuestCharges,
    });
  }

  if (booking.discountAmount && booking.discountAmount > 0) {
    rows.push({
      name: `Special Promotional Discount`,
      sub: booking.couponCode ? `Coupon applied: ${booking.couponCode}` : "Promotional discount applied",
      plan: "Offer",
      type: "Discount",
      amount: -booking.discountAmount,
      isDiscount: true,
    });
  }

  let rowY = tableY + 22;
  const rowHeight = 24;

  rows.forEach((row, idx) => {
    // Alternating background
    if (idx % 2 === 1) {
      document.save();
      document.rect(36, rowY, 523, rowHeight).fill("#f8fafc");
      document.restore();
    }

    // Row divider
    document.save();
    document.strokeColor("#f1f5f9").lineWidth(0.5).moveTo(36, rowY + rowHeight).lineTo(559, rowY + rowHeight).stroke();
    document.restore();

    // Name & Subtitle
    document.font("Helvetica-Bold").fontSize(8).fillColor(row.isDiscount ? "#059669" : "#0f172a").text(row.name, 48, rowY + 4);
    document.font("Helvetica").fontSize(6.8).fillColor("#64748b").text(row.sub, 48, rowY + 14);

    // Plan & Type
    document.font("Helvetica").fontSize(7.5).fillColor("#334155").text(row.plan, 270, rowY + 7, { width: 85, align: "center" });
    document.font("Helvetica").fontSize(7.5).fillColor("#64748b").text(row.type, 365, rowY + 7, { width: 70, align: "center" });

    // Amount
    const amountColor = row.isDiscount ? "#059669" : "#0f172a";
    const amountStr = row.isDiscount ? `- ${formatINR(Math.abs(row.amount))}` : formatINR(row.amount);
    document.font("Helvetica-Bold").fontSize(8).fillColor(amountColor).text(amountStr, 445, rowY + 7, { width: 102, align: "right" });

    rowY += rowHeight;
  });

  // 6. TOTALS & DIGITAL PASS VERIFICATION SECTION
  const summaryY = rowY + 10;
  const summaryH = 104;

  // Left: Digital Check-in Pass Box
  document.save();
  document.roundedRect(36, summaryY, 255, summaryH, 8).fillAndStroke("#f8fafc", "#cbd5e1");
  document.restore();

  if (qrBuffer) {
    document.image(qrBuffer, 46, summaryY + 12, { width: 80, height: 80 });
  }

  document.font("Helvetica-Bold").fontSize(7).fillColor("#4f46e5").text("VERIFICATION PASS", 136, summaryY + 12);
  document.font("Helvetica-Bold").fontSize(8.5).fillColor("#0f172a").text("Digital QR Check-In", 136, summaryY + 22);
  document.font("Helvetica").fontSize(6.8).fillColor("#64748b").text(
    "Scan at reception desk for biometric RFID keycard issuance.",
    136,
    summaryY + 34,
    { width: 145 }
  );
  document.font("Helvetica-Bold").fontSize(7.5).fillColor("#1e1b4b").text(
    `Ref: ${booking.bookingReference}`,
    136,
    summaryY + 58
  );
  document.font("Helvetica-Bold").fontSize(7.5).fillColor("#059669").text("[PASS] Confirmed & Paid", 136, summaryY + 70);

  // Right: Financial Summary Box
  document.save();
  document.roundedRect(304, summaryY, 255, summaryH, 8).fillAndStroke("#f8fafc", "#cbd5e1");
  document.restore();

  const subtotal = (booking.baseAmount || 0) + (booking.serviceFee || 0) + (booking.extraGuestCharges || 0);
  let totalLineY = summaryY + 10;

  document.font("Helvetica").fontSize(7.5).fillColor("#475569").text("Accommodation Subtotal:", 316, totalLineY);
  document.font("Helvetica-Bold").fontSize(7.5).fillColor("#0f172a").text(formatINR(subtotal), 445, totalLineY, { width: 102, align: "right" });

  totalLineY += 12;
  document.font("Helvetica").fontSize(7.5).fillColor("#475569").text("Goods & Services Tax (GST 12%):", 316, totalLineY);
  document.font("Helvetica-Bold").fontSize(7.5).fillColor("#0f172a").text(formatINR(booking.taxAmount || 0), 445, totalLineY, { width: 102, align: "right" });

  if (booking.securityDeposit && booking.securityDeposit > 0) {
    totalLineY += 12;
    document.font("Helvetica").fontSize(7.5).fillColor("#475569").text("Security Deposit (Refundable):", 316, totalLineY);
    document.font("Helvetica-Bold").fontSize(7.5).fillColor("#0f172a").text(formatINR(booking.securityDeposit), 445, totalLineY, { width: 102, align: "right" });
  }

  if (booking.discountAmount && booking.discountAmount > 0) {
    totalLineY += 12;
    document.font("Helvetica").fontSize(7.5).fillColor("#059669").text("Promotional Discount:", 316, totalLineY);
    document.font("Helvetica-Bold").fontSize(7.5).fillColor("#059669").text(`- ${formatINR(booking.discountAmount)}`, 445, totalLineY, { width: 102, align: "right" });
  }

  // Highlighted Total Paid Box
  const paidBoxY = summaryY + 68;
  document.save();
  document.roundedRect(312, paidBoxY, 239, 24, 4).fillAndStroke("#ecfdf5", "#86efac");
  document.restore();

  document.font("Helvetica-Bold").fontSize(8).fillColor("#065f46").text("TOTAL AMOUNT PAID:", 320, paidBoxY + 7);
  document.font("Helvetica-Bold").fontSize(11).fillColor("#047857").text(
    formatINR(booking.paidAmount || booking.totalAmount || 0),
    410,
    paidBoxY + 5,
    { width: 133, align: "right" }
  );

  // 7. PAYMENT DETAILS BANNER (Y: summaryY + summaryH + 8)
  const paymentBannerY = summaryY + summaryH + 8;
  document.save();
  document.roundedRect(36, paymentBannerY, 523, 28, 5).fillAndStroke("#f1f5f9", "#e2e8f0");
  document.restore();

  const latestPayment = booking.payments?.[0];
  const gatewayName = latestPayment?.gateway || "Razorpay / UPI";
  const txnId = latestPayment?.gatewayPaymentId || `TXN-${booking.bookingReference}`;

  document.font("Helvetica-Bold").fontSize(7).fillColor("#475569").text("PAYMENT METHOD", 46, paymentBannerY + 5);
  document.font("Helvetica").fontSize(7.5).fillColor("#0f172a").text(gatewayName, 46, paymentBannerY + 15);

  document.font("Helvetica-Bold").fontSize(7).fillColor("#475569").text("TRANSACTION REFERENCE", 175, paymentBannerY + 5);
  document.font("Helvetica").fontSize(7.5).fillColor("#0f172a").text(txnId, 175, paymentBannerY + 15);

  document.font("Helvetica-Bold").fontSize(7).fillColor("#475569").text("PAYMENT STATUS", 365, paymentBannerY + 5);
  document.font("Helvetica-Bold").fontSize(7.5).fillColor("#047857").text("CAPTURED & RECONCILED", 365, paymentBannerY + 15);

  document.font("Helvetica-Bold").fontSize(7).fillColor("#475569").text("BALANCE DUE", 475, paymentBannerY + 5);
  document.font("Helvetica-Bold").fontSize(7.5).fillColor("#0f172a").text("Rs. 0.00 (Nil)", 475, paymentBannerY + 15);

  // 8. TERMS & OFFICIAL COMPLIANCE DECLARATIONS (Y: paymentBannerY + 36)
  const termsY = paymentBannerY + 36;
  document.save();
  document.roundedRect(36, termsY, 523, 62, 5).fillAndStroke("#ffffff", "#e2e8f0");
  document.restore();

  document.font("Helvetica-Bold").fontSize(7).fillColor("#475569").text("TERMS & OFFICIAL COMPLIANCE DECLARATIONS", 46, termsY + 6);

  const notes = [
    "1. Food Safety & FSSAI: Food services operated under FSSAI Registration Number 23626028006147 (GenZ Colive PG and Guest Rooms).",
    "2. Security Deposit: Refundable deposits are settled upon check-out clearance and return of keycard, subject to Section 5 of Terms.",
    "3. Check-In & Policies: Standard check-in 1:00 PM; check-out 11:00 AM. Long-stay early vacating requires 30 days prior written notice.",
    "4. Government Verification: Valid government photo identification (Aadhaar / Passport) is required at reception. Stay is non-transferable.",
  ];

  notes.forEach((note, idx) => {
    document.font("Helvetica").fontSize(6.6).fillColor("#475569").text(note, 46, termsY + 17 + idx * 10);
  });

  // 9. FOOTER & AUTHORIZED SIGNATORY (Y: termsY + 70)
  const footerY = termsY + 70;

  // Left: Contact Support
  document.font("Helvetica-Bold").fontSize(7.5).fillColor("#0f172a").text("GenZ Living Space Support Desk", 36, footerY);
  document.font("Helvetica").fontSize(7).fillColor("#64748b").text(
    "Phone: +91 96520 37700 / +91 96520 37744   •   Email: genzlivingspace@gmail.com",
    36,
    footerY + 10
  );
  document.font("Helvetica").fontSize(7).fillColor("#64748b").text(
    "Property: Madhapur - HYD, Telangana, India   •   www.genzlivingspace.com",
    36,
    footerY + 20
  );

  // Right: Signature
  document.font("Helvetica-Bold").fontSize(7.5).fillColor("#0f172a").text("For GenZ Colive PG and Guest Rooms", 360, footerY, {
    width: 199,
    align: "right",
  });
  document.font("Helvetica").fontSize(7).fillColor("#475569").text("Authorized Digital Signatory", 360, footerY + 10, {
    width: 199,
    align: "right",
  });
  document.font("Helvetica-Oblique").fontSize(6.5).fillColor("#94a3b8").text(
    "Computer-generated invoice. No physical signature required.",
    360,
    footerY + 20,
    { width: 199, align: "right" }
  );

  // 10. BOTTOM DECORATIVE COLOR STRIP
  document.save();
  document.rect(0, 834, 595.28, 8).fill("#1e1b4b");
  document.rect(0, 830, 595.28, 4).fill("#4338ca");
  document.restore();

  document.end();

  return new Promise<Buffer>((resolve, reject) => {
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", (err) => reject(err));
  });
}
