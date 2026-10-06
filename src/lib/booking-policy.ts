const DAY_MS = 1000 * 60 * 60 * 24;

export function bookingNights(checkInDate: Date, checkOutDate: Date) {
  return Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / DAY_MS);
}

export function isLongStay(checkInDate: Date, checkOutDate: Date) {
  return bookingNights(checkInDate, checkOutDate) >= 28;
}
