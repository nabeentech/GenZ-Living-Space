# GenZ Hostel Manager — Phase 1

A staff-operated system for managing multiple hostels and their locations. Phase 1 covers resident registration, room and bed inventory, monthly fee tracking, and vacating residents. Customer self-booking and online payments are reserved for Phase 2.

## Phase 1 workflow

1. Add each hostel with its location and contact details.
2. Add rooms by floor and sharing capacity. The system creates the matching beds and tracks availability.
3. Register a resident in person, capture their details and government ID, choose a vacant bed, and enter the monthly fee.
4. Mark the first month as collected when applicable. Each stay keeps its joining-date billing cycle.
5. Record each offline fee collection. The dashboard shows fees due today, overdue, and due in the next seven days.
6. Vacate a resident when they leave. Their stay and fee history remain available, and the bed becomes vacant.

Fee collection is a staff record only. The app does not initiate or verify cash, UPI, card, bank, or online payments.

## Main screens

- **Overview** — active residents, vacant beds, fee reminders, and occupancy by hostel.
- **Residents & fees** — registration, bed allocation, resident directory, offline fee receipts, and vacating.
- **Hostels** — add locations, update property details, and activate or deactivate hostels.
- **Rooms & beds** — filter inventory by hostel and floor, add rooms, and mark vacant beds unavailable or available.

Phase 2 routes and APIs remain in the source tree but are gated from the Phase 1 staff workflow.

## Technology

- Next.js 14 App Router and TypeScript
- Prisma ORM with SQLite for local development
- HTTP-only JWT session cookie and bcrypt password hashes
- Tailwind CSS and Lucide icons

## Run locally

Requirements: Node.js 18 or newer and npm.

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set a private `JWT_SECRET` of at least 32 characters.
3. Generate the Prisma client and sync the local database:

   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. Start the app: `npm run dev`
5. Open `http://localhost:3000` and sign in at the staff login screen.

The seed script clears and recreates the local database before adding demo data. Only run `npx tsx prisma/seed.ts` against a disposable development database.

The seed creates a super-admin account: `admin@genzlivingspace.com` with password `Admin@123`. Change demo credentials and secrets before any production deployment.

## Phase 1 data

`ResidentStay` records the resident, hostel, room, bed, joining date, monthly fee, and next due date. Due dates stay aligned with the joining day; short months clamp to their final day and return to the joining day in later months. `FeeReceipt` records offline collections and the periods they cover. Vacating closes a stay without deleting its receipt history.

The existing booking and customer website implementation is retained for later Phase 2 work; middleware currently redirects those pages and returns 404 for the associated customer booking and online payment APIs.
