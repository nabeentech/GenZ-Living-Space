# GenZ Living Space - System Edge Cases & Mitigations

This document outlines all edge cases identified across the booking engine, bed allocation, pricing calculation, identity verification, payment flows, and front-desk reception operations, along with their current status and technical mitigations.

---

## 1. Navigation & Browser History Edge Cases

| # | Edge Case | Potential Risk | Current Status | Technical Implementation / Mitigation |
|---|---|---|---|---|
| **1.1** | **Confirmation Back-Button Trapping** | User completes booking, reaches `/confirmation`, and clicks the browser back button. If previous page was `/book`, the user is returned to the booking wizard where their newly reserved bed is locked, triggering a confusing *"This bed has just been reserved by another guest"* error. | **Resolved** | In [`BookClient.tsx`](src/app/(public)/book/BookClient.tsx), navigation to `/confirmation` uses `router.replace` instead of `router.push`. This replaces the checkout funnel in the browser history stack so back-navigation returns directly to the Home or Hostel page. Added a prominent **"Return to Home"** button on [`/confirmation`](src/app/(public)/confirmation/page.tsx). |
| **1.2** | **Mid-Funnel Browser Refresh (Steps 2–4)** | User refreshes the page while on Step 2 (Bed Selection) or Step 3 (Guest Details), resetting local React component state. | **Monitored** | Query parameters (`?hostel=...&checkIn=...&stayType=...`) preserve initial stay parameters across reloads. Future enhancement: serialize in-progress draft steps into `sessionStorage`. |
| **1.3** | **Multiple Tabs with Different Rooms** | User opens two hostels or rooms in separate tabs and submits a reservation in both simultaneously. | **Resolved** | Each booking submission is treated as an isolated, atomic server request. Neither tab contaminates the other's payload. |
| **1.4** | **Direct URL Access / IDOR to Confirmation** | Malicious or curious user types `/confirmation?bookingRef=GZ-999999` to peek at another resident's booking or QR pass. | **Resolved** | [`confirmation/page.tsx`](src/app/(public)/confirmation/page.tsx) enforces server-side ownership checks: if `user.role === 'CUSTOMER'` and `booking.customerId !== user.id`, the server triggers `notFound()` (HTTP 404). Unauthenticated users are redirected to login with a secure `?next=` return URL. |
| **1.5** | **Session Expiration Mid-Checkout** | User begins Step 3, but their JWT auth token expires before clicking "Confirm & Pay". | **Resolved** | [`BookClient.tsx`](src/app/(public)/book/BookClient.tsx) performs an auth probe (`/api/auth/me`) before initiating holds. If the session has lapsed, the [`BookingAuthModal.tsx`](src/components/public/BookingAuthModal.tsx) pops up seamlessly without wiping the user's form inputs. |

---

## 2. Concurrency & Bed Allocation Edge Cases

| # | Edge Case | Potential Risk | Current Status | Technical Implementation / Mitigation |
|---|---|---|---|---|
| **2.1** | **Millisecond Race Condition (Double-Booking)** | Two users click "Confirm Booking" on the exact same bed at the exact same millisecond. | **Resolved** | [`/api/bookings`](src/app/api/bookings/route.ts) wraps the allocation in an atomic Prisma transaction (`prisma.$transaction`). Inside the transaction, it re-queries conflicting reservations on `bedId`. The first commit succeeds; the second throws: *"This bed has just been reserved by another guest. Please select another bed."* |
| **2.2** | **Gender Segregation in Shared Rooms** | In a 2-share or 3-share room, a male guest reserves a bed in a room currently occupied by a female resident (or vice versa). | **Active Policy** | Rooms and room types enforce `genderCategory` (`MALE`, `FEMALE`, `MIXED`). Shared rooms require matching resident gender across beds or designated mixed co-living policies. |
| **2.3** | **Bed / Room Under Maintenance or Cleaning** | Receptionist or property manager marks a bed as `MAINTENANCE`, `CLEANING`, or `BLOCKED` while a guest is browsing. | **Resolved** | Database queries in `/api/availability` and `/api/bookings` explicitly exclude beds where `status IN ['MAINTENANCE', 'BLOCKED', 'CLEANING']` or `active === false`. |
| **2.4** | **Long-Stay Bed Overwrite** | An ongoing month-to-month tenant (`isOpenEnded: true`) lives in a bed; a daily guest attempts to book that bed 2 months in the future. | **Resolved** | In `/api/bookings/route.ts`, active long-stay and open-ended bookings permanently lock future calendar dates on that bed until property managers formally process checkout. |
| **2.5** | **Bed Hold Timeout vs. Delayed Payment** | A user holds a bed with a 15-minute window (`holdExpiresAt`), but bank OTP processing takes 16 minutes. Another user books in that gap. | **Resolved** | Payment verification routes verify that the hold has not been superseded before finalizing checkout. Expired holds are released by `releaseExpiredBookingHolds()` during availability checks. |

---

## 3. Dates, Calendar & Timezone Edge Cases

| # | Edge Case | Potential Risk | Current Status | Technical Implementation / Mitigation |
|---|---|---|---|---|
| **3.1** | **Past Date Booking** | User device clock is out of sync or an external API script submits past dates. | **Resolved** | Server checks `checkIn < today` (normalized to UTC midnight) and returns `400 Bad Request: Check-in date cannot be in the past.` |
| **3.2** | **Inverted or Zero-Night Dates** | User submits `checkOutDate <= checkInDate` (0 nights or negative duration). | **Resolved** | Server strictly requires `checkOutDate > checkInDate` and validates date object validity (`!isNaN(checkIn.getTime())`). |
| **3.3** | **IST / UTC Midnight Boundary Shifts (Off-by-One)** | In India (IST is UTC+5:30), parsing `"2026-10-11"` using local `new Date()` can shift calendar dates back to `2026-10-10 18:30:00 UTC`, creating off-by-one errors on calendar bookings. | **Resolved** | Added `addUtcCalendarDays` in [`pricing.ts`](src/lib/pricing.ts) to perform pure calendar date arithmetic without timezone distortion. |
| **3.4** | **Variable Month Lengths & Leap Years (28, 30, 31 Days)** | Monthly stay calculated on Jan 31 or Feb 28 causing month-clipping or irregular intervals. | **Resolved** | Month-to-month tenant billing intervals are anchored to standard 30-day recurring calendar billing blocks, ensuring consistent billing across months. |

---

## 4. Pricing, Coupons & Financial Integrity Edge Cases

| # | Edge Case | Potential Risk | Current Status | Technical Implementation / Mitigation |
|---|---|---|---|---|
| **4.1** | **Client-Side Payload Tampering** | Malicious user tampers with the JSON payload to send `totalAmount: ₹1` or `discountAmount: ₹99999`. | **Resolved** | The backend `/api/bookings` **completely ignores** client-submitted price totals. It independently calculates base price, taxes, deposits, and discounts directly from database rate cards using `calculateBookingPrice()`. |
| **4.2** | **Coupon Over-Usage / Expiration / Scope Mismatch** | User applies a coupon that has reached its usage limit, expired minutes ago, or belongs to a different hostel branch. | **Resolved** | Server validates `coupon.active`, `startDate <= now`, `expiryDate >= now`, `usedCount < usageLimit`, and `applicableHostelId === hostelId`. |
| **4.3** | **Negative or Zero Total Payable** | An aggressive percentage coupon or discount reduces stay price below zero. | **Resolved** | Pricing logic floors minimum payable amounts so totals cannot become negative or bypass non-discountable fees. |
| **4.4** | **Monthly Fees vs. Daily Fees Separation** | Daily guest mistakenly charged ₹5,000 security deposit, or monthly tenant missing maintenance fee. | **Resolved** | Handled in [`pricing.ts`](src/lib/pricing.ts): ₹2,000 maintenance fee and ₹5,000 security deposit apply strictly to `MONTHLY` stays. Hospitality GST is completely removed (0%). |

---

## 5. Identity, Government ID & Authentication Edge Cases

| # | Edge Case | Potential Risk | Current Status | Technical Implementation / Mitigation |
|---|---|---|---|---|
| **5.1** | **Unauthenticated Guest Reaching Final Step** | User bypasses UI or calls API without credentials. | **Resolved** | Step 2 -> Step 3 transition gatekeeps through [`BookingAuthModal.tsx`](src/components/public/BookingAuthModal.tsx). Server validates session and returns `401 Unauthorized` if unauthenticated. |
| **5.2** | **Staff / Admin Booking via Customer Flow** | Front-desk staff tries to book using receptionist/admin account in resident portal. | **Resolved** | `/api/bookings` requires `user.role === 'CUSTOMER'`. Front desk staff are routed to `/admin/walkin` for walk-in registrations. |
| **5.3** | **Invalid Government ID Format** | User submits an incomplete Aadhaar (needs 12 digits) or invalid PAN (needs 10 chars). | **Resolved** | Client uses auto-hyphenation masks (`XXXX-XXXX-XXXX` for Aadhaar, `AAAAA-9999-A` for PAN). Validation confirms exact character length before proceeding. |
| **5.4** | **Profile Syncing for Returning Residents** | Returning resident has to re-type their phone and Government ID every stay. | **Resolved** | `/api/auth/me` pre-populates name, email, phone, gender, and saved Government ID directly into Step 3 inputs. |

---

## 6. Payment Gateway, Checkout & Front Desk Edge Cases

| # | Edge Case | Potential Risk | Current Status | Technical Implementation / Mitigation |
|---|---|---|---|---|
| **6.1** | **Payment Modal Dismissal / User Abandonment** | User opens payment modal and closes it without paying. | **Resolved** | Booking remains in pending state until paid or hold expires; bed is not permanently frozen. |
| **6.2** | **Bank Debited but Network Drops Before Callback** | Money is deducted from the resident's account, but mobile internet drops before browser receives success redirect. | **Resolved** | Webhook verification endpoint reconciles payment with Razorpay order ID. Admin desk can search by reference or customer phone at `/admin/checkin` and verify payment. |
| **6.3** | **Early Arrival Check-In** | Resident arrives at 8 AM, but standard check-in time is 2 PM (or arrives 1 day early). | **Resolved** | Reception desk check-in system allows authorized staff to inspect room availability and process early check-ins with key hand-over. |
| **6.4** | **No-Show Reservation** | Resident does not arrive on check-in date. | **Resolved** | Reservation remains stored with status `CONFIRMED`. Property managers can mark `NO_SHOW` or release bed back to inventory via administrative controls. |
| **6.5** | **Mobile QR Scanner Camera Permissions on Local Wi-Fi** | Admin opens `/admin/checkin` on a smartphone over local Wi-Fi (`http://192.168.x.x:3000`). Mobile browsers (iOS Safari & Chrome) block live WebRTC video streams on non-HTTPS origins. | **Resolved** | Dual-mode front desk scanner: provides **Live Camera** (for HTTPS/localhost) and **Snap Photo** (uses native `<input capture="environment">`), which works 100% on any mobile phone regardless of SSL. |
