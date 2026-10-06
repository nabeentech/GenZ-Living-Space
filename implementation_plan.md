# Implementation Plan: GenZ Living Space Hostel Booking & Operating Platform

Build a complete, production-ready hostel booking and hostel management web application from scratch for the proprietary brand **GenZ Living Space**, managing its two exclusive Madhapur properties in Hyderabad.

---

## User Review Required

> [!IMPORTANT]
> **Database Selection:** We will implement the database using **Prisma ORM with SQLite** for instantaneous, zero-configuration local execution (`prisma/dev.db`). The schema and queries are 100% PostgreSQL-compatible, so switching to a production PostgreSQL database simply requires updating the `DATABASE_URL` in `.env`.

> [!IMPORTANT]
> **Payments Architecture:** A real Razorpay integration architecture is implemented with environment variable configuration (`PAYMENT_KEY_ID`, `PAYMENT_KEY_SECRET`, `PAYMENT_WEBHOOK_SECRET`). For local demo and immediate evaluation, an interactive **Razorpay Simulator / Sandbox Checkout** will be active when test keys are present, validating signatures and triggering webhooks server-side.

---

## Proposed System Architecture

### 1. Technology Stack
* **Framework**: Next.js 14/15 App Router (`/app`), React 19, TypeScript
* **Styling**: Tailwind CSS with custom Gen-Z design tokens (Electric Indigo, Cyber Violet, Coral Sunset, Midnight Dark Mode, sleek glassmorphism, rounded card aesthetics)
* **Icons & Animation**: `lucide-react`, smooth CSS micro-interactions and transitions
* **ORM & Database**: Prisma ORM with SQLite (PostgreSQL compatible)
* **Auth & Security**: JWT session cookies, bcryptjs password hashing, Role-Based Access Control (RBAC) middleware
* **QR Check-in**: `qrcode` generation on booking confirmation + in-app QR scanner / manual lookup for reception
* **Invoicing**: Professional HTML/printable PDF invoice engine with GST breakdown, security deposits, and discounts

---

## Key Modules & Features

```
                      ┌──────────────────────────────────────────┐
                      │            GenZ Living Space             │
                      └────────────────────┬─────────────────────┘
                                           │
             ┌─────────────────────────────┴─────────────────────────────┐
             ▼                                                           ▼
┌──────────────────────────┐                               ┌──────────────────────────┐
│   Customer Experience    │                               │     Hostel OS / Admin    │
├──────────────────────────┤                               ├──────────────────────────┤
│ • 2 Madhapur Properties  │                               │ • Visual Bed Allocation  │
│ • Real-time Bed Matrix   │                               │ • Check-In / Check-Out QR│
│ • Central Pricing Engine │                               │ • Booking Management     │
│ • 15-min Temp Hold Lock  │                               │ • Walk-in Booking Desk   │
│ • Razorpay / Demo Pay    │                               │ • Housekeeping & Maint.  │
│ • Instant QR Confirmation│                               │ • Financials & Refunds   │
│ • Customer Dashboard     │                               │ • Support & Complaints   │
│ • Invoices & Ticket Desk │                               │ • Role-Based Access      │
│ • Stay Reviews           │                               │ • CMS & Audit Logs       │
└──────────────────────────┘                               └──────────────────────────┘
```

### 1. Public Discovery & Booking Engine
* **Homepage (`/`)**:
  * Hero search bar with property selector, check-in/out date pickers, guest counter
  * All 4 featured properties with dynamic pricing, amenities, and availability badges
  * "Why GenZ Living Space" (Ultra-fast fiber Wi-Fi, Creator pods, Community events, Biometric safety, Café)
  * Dynamic testimonials, Instagram community wall, FAQs, and contact info
* **Hostel Catalog (`/hostels`) & Detail (`/hostels/[slug]`)**:
  * High-res imagery gallery, address, interactive map coordinates, house rules, nearby hotspots
  * Real-time Room & Bed availability cards (4-Bed Dorm, 6-Bed Dorm, 8-Bed Dorm, Twin Sharing, Private Room)
  * Sticky Booking Widget calculating pricing in real-time
* **Multi-Step Checkout Flow (`/book`)**:
  * Step 1: Stay dates & Stay duration (Daily, Weekly, Monthly with custom tier rates)
  * Step 2: Room & Gender category (Male, Female, Mixed, Private)
  * Step 3: Interactive Bed Picker (Lower Bunk, Upper Bunk, Window, Private)
  * Step 4: Guest information & Government ID collection
  * Step 5: Coupon code engine with instant price breakdown (Base + 12% GST + Service Fee + Refundable Deposit - Discount)
  * Step 6: 15-minute temporary bed hold lock during payment session
  * Step 7: Razorpay checkout modal / test simulator with server-side signature validation
  * Step 8: Confirmed Booking Screen with QR Code, Calendar add, and Invoice download

### 2. Customer Dashboard (`/dashboard`)
* **Overview**: Active stay details, upcoming reservations, check-in status, outstanding balance
* **My Bookings**: Full history with printable invoices, QR pass, cancellation with automated refund calculation based on cancellation policy
* **Payments & Receipts**: Transaction logs, security deposit tracking
* **Support & Complaints**: Submit issues (Wi-Fi, Cleaning, Maintenance, Noise) with real-time status tracking (Open, In Progress, Resolved)
* **Profile**: Personal information, emergency contact, ID verification status

### 3. Comprehensive Admin Management (`/admin`)
* **Role-Based Access Control**:
  * Super Admin (Full access)
  * Property Manager (Assigned hostel operations)
  * Receptionist (Check-in/out, bookings, walk-ins)
  * Finance (Payments, invoices, refunds, financial reports)
  * Housekeeping (Room cleaning and bed inspection statuses)
  * Support Staff (Customer tickets and complaints)
* **Admin Dashboard Overview (`/admin`)**:
  * Live KPI metrics: Total Bookings, Today's Check-ins, Today's Check-outs, Occupancy %, Revenue, Open Complaints
  * Monthly Revenue Chart, Occupancy by Property, Booking Trends
* **Visual Bed Allocation Matrix (`/admin/beds` & `/admin/calendar`)**:
  * Interactive room & bed grid grouped by Building/Floor
  * Live status tags: `Available` (Green), `Reserved` (Blue), `Occupied` (Purple), `Cleaning` (Orange), `Maintenance` (Red)
  * Drag or 1-click bed re-assignment with automatic audit logging
* **Reception QR Check-In & Check-Out Desk (`/admin/checkin`)**:
  * QR Code camera/input scanner for instant guest lookup
  * Document verification and instant check-in
  * 1-click check-out with automatic additional charge tallying (Laundry, Lost Key, Damages, Late Checkout) and bed release to `Cleaning`
* **Walk-In Booking Desk (`/admin/walkin`)**:
  * Instant on-desk booking with Cash, UPI, Card, or Bank Transfer
* **Financial Management (`/admin/payments` & `/admin/refunds`)**:
  * Payment ledger with gateway IDs, transaction timestamps, and refund approvals
  * Printable GST Tax Invoices
* **Housekeeping & Maintenance Board (`/admin/housekeeping`)**:
  * Room and bed cleaning queue (Dirty -> In Progress -> Clean -> Inspected)
* **Coupons, CMS, Reports & Audit Trail**:
  * Coupon creator (Percentage or Flat, expiry, usage limits)
  * CMS editor for homepage content and FAQ updates
  * Exportable reports (CSV revenue, occupancy rates)
  * Audit logs tracking all critical staff operations

---

## Proposed File & Directory Structure

```
c:\Users\HP Gaming\OneDrive\Desktop\GenZ\
├── prisma/
│   ├── schema.prisma            # Full relational model (20+ entities)
│   ├── seed.ts                  # Seeds 4 hostels, rooms, beds, admin roles, coupons
├── src/
│   ├── app/
│   │   ├── (public)/            # Customer-facing public layout
│   │   │   ├── page.tsx         # Modern Gen-Z Homepage
│   │   │   ├── hostels/         # Hostels listing & details
│   │   │   │   ├── page.tsx
│   │   │   │   └── [slug]/page.tsx
│   │   │   ├── book/page.tsx    # Multi-step booking engine
│   │   │   ├── confirmation/page.tsx # Booking confirmation & QR pass
│   │   │   ├── auth/            # Login & Registration
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── register/page.tsx
│   │   │   └── dashboard/       # Customer portal (stays, invoices, tickets)
│   │   │       ├── page.tsx
│   │   │       ├── bookings/page.tsx
│   │   │       ├── profile/page.tsx
│   │   │       └── support/page.tsx
│   │   ├── admin/               # Dedicated Admin Portal
│   │   │   ├── layout.tsx       # Admin Sidebar, Topbar, Role Guard
│   │   │   ├── page.tsx         # KPI Dashboard & Charts
│   │   │   ├── hostels/page.tsx # Property management
│   │   │   ├── rooms/page.tsx   # Room configuration
│   │   │   ├── beds/page.tsx    # Visual Bed Allocation Matrix
│   │   │   ├── bookings/page.tsx# Booking table, filters, actions
│   │   │   ├── checkin/page.tsx # QR Reception Scanner & Check-in/out
│   │   │   ├── walkin/page.tsx  # Walk-in reservation desk
│   │   │   ├── payments/page.tsx# Payments & Refunds
│   │   │   ├── housekeeping/page.tsx # Cleaning & Maintenance Kanban
│   │   │   ├── complaints/page.tsx # Support tickets
│   │   │   ├── coupons/page.tsx # Promo code manager
│   │   │   ├── reports/page.tsx # Financial & Occupancy reports
│   │   │   ├── cms/page.tsx     # Homepage & Website CMS
│   │   │   └── audit-logs/page.tsx # Security & Action audit trail
│   │   └── api/                 # Secure RESTful APIs
│   │       ├── auth/            # NextAuth / JWT login & register
│   │       ├── hostels/         # Discovery & Details
│   │       ├── availability/    # Real-time room/bed availability & holds
│   │       ├── bookings/        # Booking creation, cancellation, lookup
│   │       ├── payments/        # Razorpay order create, verify, webhook
│   │       ├── checkin/         # QR Check-in & Check-out actions
│   │       ├── admin/           # Administrative CRUD endpoints
│   │       └── support/         # Customer complaints & replies
│   ├── components/              # Reusable UI Component Library
│   │   ├── ui/                  # Buttons, Modals, Inputs, Badges, Tabs
│   │   ├── public/              # Navbar, Hero, PropertyCard, Footer
│   │   ├── booking/             # BedPicker, PriceSummary, HoldCountdown
│   │   └── admin/               # AdminSidebar, BedMatrixGrid, StatCard, QRScanner
│   ├── lib/                     # Utilities & Core Services
│   │   ├── prisma.ts            # Prisma client singleton
│   │   ├── auth.ts              # Session & password hashing utils
│   │   ├── pricing.ts           # Central pricing engine (taxes, deposits, discounts)
│   │   ├── razorpay.ts          # Payment gateway integration & simulation
│   │   ├── qr.ts                # QR Code generator
│   │   └── audit.ts             # System audit logger
├── .env.example                 # Standardized environment template
├── README.md                    # Complete setup, running, and admin documentation
└── package.json
```

---

## 4 Hostels Seed Details

1. **GenZ Hub Koramangala (Bengaluru)**
   * *Tagline*: The Startup & Tech Creator Pad
   * *Location*: 80 Feet Road, 4th Block, Koramangala, Bengaluru, Karnataka
   * *Rooms*: 8 (Dorms + Private Studios), 34 Beds total
   * *Vibe*: Rooftop co-working, fiber optic Wi-Fi, podcast studio, weekly founder meetups
2. **GenZ Oasis Indiranagar (Bengaluru)**
   * *Tagline*: Cafe Culture & Nightlife Haven
   * *Location*: 100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka
   * *Rooms*: 6 (Dorms + Twin Sharing), 26 Beds total
   * *Vibe*: Art lounge, open-air café, acoustic weekends, designer pod beds
3. **GenZ CyberNest HSR Layout (Bengaluru)**
   * *Tagline*: The Builder House & Hacker Den
   * *Location*: Sector 3, HSR Layout, Bengaluru, Karnataka
   * *Rooms*: 7 (Hacker Pods + Dorms), 28 Beds total
   * *Vibe*: 24/7 ergonomic desks, maker lab, dual-monitor stations, gaming zone
4. **GenZ Haven North Goa (Anjuna)**
   * *Tagline*: Workation, Sunsets & Social Living
   * *Location*: Anjuna Beach Road, North Goa, Goa
   * *Rooms*: 8 (Poolside Dorms + Private Cabins), 32 Beds total
   * *Vibe*: Pool, open-air co-working, yoga deck, sunset acoustic sessions, scooter rentals

---

## Pre-Configured Demo Credentials

* **Super Admin**: `admin@genzlivingspace.com` / `Admin@123`
* **Property Manager**: `manager@genzlivingspace.com` / `Manager@123`
* **Receptionist**: `reception@genzlivingspace.com` / `Reception@123`
* **Demo Customer**: `sameer@gmail.com` / `Customer@123`

---

## Verification Plan

### Automated & Build Verification
* `npm run build`: Verify zero TypeScript errors and successful Next.js static & dynamic routes generation
* `npx prisma db seed`: Verify all 4 properties, rooms, beds, admin users, and coupons populate correctly

### Functional Manual & Browser Verification
1. **Public Discovery**: Browse homepage, search availability for 4 hostels, filter by city/vibe.
2. **Booking & Hold Flow**: Select Koramangala -> Choose 4-Bed Dorm -> Pick Bed A -> Enter guest details -> Apply coupon `GENZFIRST` -> Verify 15-minute temporary hold timer -> Complete payment simulation -> Land on `/confirmation` with valid QR Code.
3. **Double-Booking Prevention**: Attempt to book the exact same bed for overlapping dates in a second tab/window; confirm it is blocked.
4. **Customer Portal**: View active booking in `/dashboard`, test invoice generation, test cancellation & refund quote.
5. **Admin Operations**:
   * Log into `/admin` with Super Admin credentials.
   * View live KPI statistics and occupancy rates.
   * Check Bed Matrix (`/admin/beds`): verify booked bed displays occupied with guest details.
   * Scan / Enter QR code in Reception Desk (`/admin/checkin`) -> Perform Check-In -> Verify status changes to `CHECKED_IN`.
   * Test 1-click Check-Out -> Verify additional charge logging and bed resets to `CLEANING`.
   * Create a walk-in booking and verify instant bed lock.
   * Submit and reply to customer support tickets.
