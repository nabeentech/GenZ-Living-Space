# GenZ Living Space — Hostel Booking & Operating System (PMS)

A complete, production-grade proprietary hostel operating system and customer booking web platform built exclusively for **GenZ Living Space** managing its 2 boutique properties in Madhapur, Hyderabad.

---

## 1. Project Overview

GenZ Living Space is **NOT an aggregator or marketplace** like Airbnb or Booking.com. It is a purpose-built, dedicated hospitality operating system for GenZ Living Space's 2 proprietary properties:
1. **Madhapur - 01** — Tech startup pads & rooftop creator terrace
2. **Madhapur - 02** — Artisanal cafe culture & social community living

### Key System Capabilities
* **End-to-End Booking Engine**: Real-time bed availability matrix, 15-minute temporary reservation hold lock, double-booking prevention via atomic transactional queries, and automated GST/discount price breakdown.
* **Razorpay Payment Gateway Architecture**: Server-side order creation, HMAC-SHA256 signature verification, and instant sandbox simulator for test workflows.
* **Reception QR Check-In & Check-Out**: Fast QR code verification, 1-click check-in, keycard assignment, additional charge recording (laundry, keycard replacement, damages), and automatic bed release to Housekeeping.
* **Walk-in Booking Desk**: Counter reservation tool for on-spot arrivals supporting Cash, UPI, and Card.
* **Visual Bed Allocation Matrix**: Dynamic floor-by-floor, room-by-room grid showing status (`AVAILABLE`, `OCCUPIED`, `RESERVED`, `CLEANING`, `MAINTENANCE`) with 1-click status override.
* **Housekeeping Kanban Queue**: Real-time cleaning workflow (`DIRTY` -> `CLEANING` -> `CLEAN` -> `INSPECTED`).
* **Resident Support & Complaints**: Ticket center with categorized complaints (Wi-Fi, Noise, Cleaning, Room) and staff response desk.
* **Financial Ledger & Invoices**: Captured transactions ledger, policy-based refund approval/rejection queue, and printable official GST Tax Invoices.
* **Coupons & Promotions**: Promo code engine supporting percentage and flat discounts, minimum spends, and caps.
* **Website CMS**: Live editing of homepage headlines, subheadlines, taglines, and contact phone/email without touching code.
* **Audit Trail**: Immutable system logs recording every critical action.

---

## 2. Technology Stack

* **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Server Components & Route Handlers)
* **Language**: TypeScript
* **Styling**: Tailwind CSS with custom Gen-Z color system (Electric Indigo, Neon Coral, Cyber Cyan, Midnight Dark Surfaces)
* **Database & ORM**: Prisma ORM with SQLite (PostgreSQL compatible)
* **Authentication**: HTTP-only JWT session cookies with bcrypt password hashing & Role-Based Access Control (RBAC)
* **QR Codes**: `qrcode` library
* **Icons**: `lucide-react`
* **Animations**: `canvas-confetti` celebration & smooth CSS micro-interactions

---

## 3. Pre-Seeded Demo Accounts

The database comes pre-seeded with accounts for all roles:

| Role | Email | Password | Scope |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@genzlivingspace.com` | `Admin@123` | Full unrestricted access to all properties & settings |
| **Property Manager** | `manager@genzlivingspace.com` | `Manager@123` | Property operations, rooms, bookings |
| **Receptionist** | `reception@genzlivingspace.com` | `Reception@123` | QR Check-in/out, walk-in desk, guest ledger |
| **Finance Staff** | `finance@genzlivingspace.com` | `Finance@123` | Payments, invoices, refund queue, reports |
| **Housekeeping** | `cleaning@genzlivingspace.com` | `Clean@123` | Cleaning board, room status inspection |
| **Demo Resident** | `sameer@gmail.com` | `Customer@123` | Customer portal, bookings, support tickets |

> *Quick Login:* The `/auth/login` page includes **1-click demo buttons** to fill these credentials automatically.

---

## 4. Setup & Running Locally

### Prerequisites
* Node.js v18+ or v20+
* npm

### Steps

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. **Initialize Database & Seed 2 Madhapur Hostels**:
   ```bash
   npx prisma generate
   npx prisma db push
   npx tsx prisma/seed.ts
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. Booking & Pricing Engine Logic

* **Short vs Long-Term Stays**:
  * **Daily (< 7 nights)**: Base room rate $\times$ nights
  * **Weekly (7 - 27 nights)**: Automatically applies weekly discount (10–15%)
  * **Monthly ($\ge$ 28 nights)**: Prorated monthly membership rate + refundable security deposit (₹3,000)
* **GST Calculation**: Standard 12% hospitality tier computed on taxable accommodation amount
* **Temporary Hold Guarantee**: 15-minute countdown locks the selected bed in the database with `holdExpiresAt = now + 15m`. If payment is abandoned, the bed is automatically released.
* **Double-Booking Prevention**: Prisma `$transaction` verifies that no overlapping reservation exists for that exact bed:
  $$\text{checkIn} < \text{requestedCheckOut} \quad \text{AND} \quad \text{checkOut} > \text{requestedCheckIn}$$
  with status `CONFIRMED`, `CHECKED_IN`, or active `PAYMENT_PENDING`.

---

## 6. Project Architecture

```
src/
├── app/
│   ├── (public)/                 # Customer-facing public layout
│   │   ├── page.tsx              # Modern Gen-Z Homepage
│   │   ├── hostels/              # Hostels Catalog & Detail
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   ├── book/page.tsx         # Multi-step booking engine
│   │   ├── confirmation/page.tsx # QR pass & printable invoice
│   │   ├── auth/                 # Sign In & Sign Up
│   │   └── dashboard/            # Resident Portal (bookings, refunds, tickets)
│   ├── admin/                    # Administrative OS
│   │   ├── layout.tsx            # Staff sidebar & RBAC guard
│   │   ├── page.tsx              # Executive KPIs & Charts
│   │   ├── beds/                 # Visual Bed Allocation Matrix
│   │   ├── checkin/              # Reception QR Scanner Desk
│   │   ├── walkin/               # Walk-In Reservation Desk
│   │   ├── bookings/             # Reservations Ledger & Actions
│   │   ├── housekeeping/         # Cleaning & Sanitation Kanban
│   │   ├── complaints/           # Customer Support & Staff Replies
│   │   ├── coupons/              # Promo code creator
│   │   ├── payments/             # Payments, Invoices, Refund Approvals
│   │   ├── reports/              # Analytics & CSV Data Exporter
│   │   ├── cms/                  # Website copy editor
│   │   └── audit-logs/           # System compliance trail
│   └── api/                      # REST Endpoints
│       ├── auth/                 # Login, Register, Logout, Me
│       ├── hostels/              # Hostels discovery
│       ├── availability/         # Real-time bed availability check
│       ├── bookings/             # Booking create, hold, cancel, refund
│       ├── payments/             # Order creation & signature verification
│       ├── checkin/              # QR check-in & checkout actions
│       └── admin/                # Beds, walk-in, complaints, CMS
├── components/                   # UI Library (Button, Badge, Modal, Navbar, Footer)
└── lib/                          # Core Services (Prisma, Auth, Pricing, Razorpay, QR, Invoices)
```

---

## 7. Production Deployment

To run in production with PostgreSQL:
1. Change `datasource db` in `prisma/schema.prisma` from `sqlite` to `postgresql`.
2. Set `DATABASE_URL="postgresql://user:pass@host:5432/genz_db"` in `.env`.
3. Run `npx prisma db push && npx tsx prisma/seed.ts`.
4. Build bundle: `npm run build && npm run start`.
