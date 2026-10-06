import QRCode from "qrcode";

export async function generateBookingQRCode(bookingReference: string, bookingId: string): Promise<string> {
  const payload = JSON.stringify({
    ref: bookingReference,
    id: bookingId,
    app: "GenZ Living Space",
    verifiedAt: new Date().toISOString(),
  });

  try {
    const qrDataUrl = await QRCode.toDataURL(payload, {
      width: 320,
      margin: 2,
      color: {
        dark: "#0B0F19",
        light: "#FFFFFF",
      },
    });
    return qrDataUrl;
  } catch (error) {
    console.error("Error generating QR code:", error);
    return "";
  }
}
