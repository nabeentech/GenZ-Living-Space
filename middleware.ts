import { NextRequest, NextResponse } from "next/server";

const phaseTwoPages = ["/hostels", "/book", "/confirmation", "/dashboard", "/auth/register", "/privacy", "/terms", "/refund-policy"];
const phaseTwoApis = ["/api/hostels", "/api/availability", "/api/bookings", "/api/payments", "/api/checkout", "/api/invoices", "/api/support", "/api/auth/register"];
const deferredAdminPages = ["/admin/audit-logs", "/admin/bookings", "/admin/checkin", "/admin/cms", "/admin/complaints", "/admin/coupons", "/admin/customers", "/admin/extensions", "/admin/housekeeping", "/admin/manager", "/admin/payments", "/admin/pricing", "/admin/receptionist", "/admin/reports", "/admin/rooms", "/admin/walkin"];
const deferredAdminApis = ["/api/admin/bookings", "/api/admin/cms", "/api/admin/complaints", "/api/admin/coupons", "/api/admin/housekeeping", "/api/admin/refunds", "/api/admin/room-types", "/api/admin/walkin", "/api/admin/floors", "/api/checkin"];

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (phaseTwoApis.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return NextResponse.json({ success: false, message: "This customer booking feature is reserved for Phase 2." }, { status: 404 });
  }
  if (deferredAdminApis.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return NextResponse.json({ success: false, message: "This feature is outside the Phase 1 staff workflow." }, { status: 404 });
  }
  if (deferredAdminPages.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }
  if (phaseTwoPages.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }
  if (path === "/") return NextResponse.redirect(new URL("/auth/login", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
