/**
 * Returns true if the booking was created via Reception Walk-In (GZ-W prefix),
 * false if it was created via the public Online booking flow.
 */
export function isWalkInBooking(bookingReference?: string | null): boolean {
  return Boolean(bookingReference && bookingReference.toUpperCase().startsWith("GZ-W"));
}

/**
 * Builds a pre-filled WhatsApp click-to-chat URL for an Indian 10-digit mobile number.
 */
export function buildWhatsAppLink(phone?: string | null, message?: string): string | null {
  const digits = (phone || "").replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) return null;
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/91${digits}${text}`;
}
