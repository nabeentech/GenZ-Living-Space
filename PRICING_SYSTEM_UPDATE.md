# GenZ Hostels - Simplified 3-Room-Type Pricing System

## Overview
Simplified the hostel booking system to support only **3 room types** with **separate AC/Non-AC pricing** for each room type. Each room can now have completely independent pricing for AC and Non-AC variants.

## Changes Made

### 1. Database Schema Update
**File:** `prisma/schema.prisma`

#### Removed Old Structure
- Removed generic `pricePerDay`, `price7Days`, `price10Days`, `price15Days`, `price30Days` fields
- Made `basePrice` and `monthlyPrice` optional for backwards compatibility

#### New AC/Non-AC Pricing Structure
Each room type now has TWO sets of pricing tiers:

**Non-AC Pricing Fields:**
- `pricePerDayNonAC` - 1-day rate for Non-AC rooms
- `price7DaysNonAC` - 7-day (1 week) rate for Non-AC rooms
- `price10DaysNonAC` - 10-day rate for Non-AC rooms
- `price15DaysNonAC` - 15-day rate for Non-AC rooms
- `price30DaysNonAC` - 30-day (monthly) rate for Non-AC rooms

**AC Pricing Fields:**
- `pricePerDayAC` - 1-day rate for AC rooms
- `price7DaysAC` - 7-day (1 week) rate for AC rooms
- `price10DaysAC` - 10-day rate for AC rooms
- `price15DaysAC` - 15-day rate for AC rooms
- `price30DaysAC` - 30-day (monthly) rate for AC rooms

### 2. Room Types Configuration
**File:** `prisma/seed.ts`

Only 3 room types are now created:

#### 1. Twin Sharing Pod Room
- **Capacity:** 2 beds
- **Non-AC Pricing (per bed/month):**
  - 1-Day: ₹1,099
  - 7-Day: ₹7,090
  - 10-Day: ₹10,190
  - 15-Day: ₹15,285
  - 30-Day: ₹23,999

- **AC Pricing (per bed/month):**
  - 1-Day: ₹1,299
  - 7-Day: ₹8,392
  - 10-Day: ₹11,991
  - 15-Day: ₹17,986
  - 30-Day: ₹27,999

#### 2. Triple Sharing
- **Capacity:** 3 beds
- **Non-AC Pricing (per bed/month):**
  - 1-Day: ₹499
  - 7-Day: ₹3,293
  - 10-Day: ₹4,490
  - 15-Day: ₹6,735
  - 30-Day: ₹11,499

- **AC Pricing (per bed/month):**
  - 1-Day: ₹599
  - 7-Day: ₹3,842
  - 10-Day: ₹5,390
  - 15-Day: ₹8,085
  - 30-Day: ₹13,499

#### 3. Private Creator Studio
- **Capacity:** 1 bed (single)
- **Non-AC Pricing (per room/month):**
  - 1-Day: ₹1,999
  - 7-Day: ₹12,993
  - 10-Day: ₹17,990
  - 15-Day: ₹26,985
  - 30-Day: ₹37,999

- **AC Pricing (per room/month):**
  - 1-Day: ₹2,299
  - 7-Day: ₹14,793
  - 10-Day: ₹20,791
  - 15-Day: ₹31,186
  - 30-Day: ₹42,999

### 3. Room Seeding (40 Total Rooms)
**File:** `prisma/seed.ts`

All 40 rooms automatically assigned to the 3 room types:

- **Rooms 101-120:** Twin Sharing Pod Room (20 rooms, 2 beds each)
- **Rooms 121-130:** Triple Sharing (10 rooms, 3 beds each)
- **Rooms 131-140:** Private Creator Studio (10 rooms, 1 bed each)

Each room is automatically set as **AC or Non-AC** using even/odd pattern:
- **Even-numbered rooms:** AC (₹XX/bed/month)
- **Odd-numbered rooms:** Non-AC (₹XX/bed/month)

### 4. Admin Pricing Management UI
**Files:** 
- `src/app/admin/pricing/page.tsx` (Server wrapper)
- `src/app/admin/pricing/PricingManagementClient.tsx` (Client component)

#### Features:
- **Separate AC/Non-AC Sections** - Each room type displays pricing for both variants side-by-side
- **Expandable Cards** - Click room type card to expand and edit all pricing tiers
- **Real-time Editing** - Update prices in individual fields
- **Save Functionality** - Persist changes to database via API
- **Success/Error Notifications** - Visual feedback with auto-dismissing alerts
- **Responsive Design** - Works on mobile and desktop

#### UI Layout:
```
Room Type Card (Header)
├─ Room Name & Description
├─ Current AC/Non-AC Day Rates
└─ [Click to Expand]
   │
   └─ Expanded View
      ├─ Non-AC Pricing Section (5 tier fields)
      ├─ AC Pricing Section (5 tier fields)
      └─ Save Button
```

### 5. API Updates
**File:** `src/app/api/admin/room-types/[id]/route.ts`

Updated PATCH endpoint to accept and store:
- All Non-AC pricing fields (`pricePerDayNonAC`, `price7DaysNonAC`, etc.)
- All AC pricing fields (`pricePerDayAC`, `price7DaysAC`, etc.)

### 6. Admin Sidebar Navigation
**File:** `src/app/admin/AdminSidebar.tsx`

Added "Pricing Management" link:
- **Route:** `/admin/pricing`
- **Icon:** DollarSign
- **Roles:** PROPERTY_MANAGER, SUPER_ADMIN
- **Position:** After "Room Management"

### 7. Bug Fixes
Fixed nullable `basePrice` and `monthlyPrice` fields:

**Files Modified:**
- `src/app/api/bookings/route.ts` - Added fallback values (999 for daily, 21999 for monthly)
- `src/app/api/bookings/[id]/extend/route.ts` - Same fallback values
- `src/app/(public)/book/BookClient.tsx` - Same fallback values
- `src/app/(public)/hostels/[slug]/HostelBookingWidget.tsx` - Same fallback values

## Database Reset
Complete database reset was performed:
1. Schema updated with new pricing structure
2. Database pushed with `--force-reset`
3. Database seeded with 3 room types and 40 rooms
4. All legacy room types removed

## How It Works

### For Customers (Booking Page)
1. Customer selects dates for stay
2. System determines booking duration (1 day, 7 days, 10 days, 15 days, or 30+ days)
3. Based on duration, system fetches correct pricing tier from room type
4. Room's `isAC` status determines which pricing set is used (AC vs Non-AC)
5. Price is displayed with tier label (1-DAY RATE, 1-WEEK RATE, etc.)

### For Admin (Pricing Management)
1. Navigate to Admin Panel → Pricing Management
2. Click any room type card to expand
3. Update pricing for both AC and Non-AC sections independently
4. Click "Save Pricing" to persist
5. Changes immediately affect all bookings with that room type

## Database Layout Example

**RoomType Table:**
```
| id | name                    | pricePerDayNonAC | pricePerDayAC | price7DaysNonAC | price7DaysAC | ... |
|----|-------------------------|------------------|---------------|-----------------|--------------|-----|
| x1 | Twin Sharing Pod Room   | 1099             | 1299          | 7090            | 8392         | ... |
| x2 | Triple Sharing          | 499              | 599           | 3293            | 3842         | ... |
| x3 | Private Creator Studio  | 1999             | 2299          | 12993           | 14793        | ... |
```

**Room Table:**
```
| id | roomNumber | roomTypeId | isAC  |
|----|------------|------------|-------|
| r1 | 101        | x1         | false |
| r2 | 102        | x1         | true  |
| r3 | 103        | x1         | false |
| ... | ... | ... | ... |
| r40 | 140       | x3         | true  |
```

## Pricing Strategy

The system now allows:

1. **Independent Pricing** - Each room type has completely separate AC/Non-AC pricing
2. **Granular Control** - Update individual pricing tiers without affecting others
3. **Duration-Based Discounts** - Offer different rates for 1-day, 7-day, 10-day, 15-day, and monthly bookings
4. **AC Premium** - Charge more for AC rooms compared to Non-AC

## Testing Checklist

- ✅ Database schema updated and migrated
- ✅ Seed created 3 room types with AC/Non-AC pricing
- ✅ 40 rooms seeded with correct type assignments
- ✅ Admin pricing UI displays AC/Non-AC sections correctly
- ✅ Save functionality updates database
- ✅ Build passes without errors
- ✅ Dev server runs successfully on port 3003

## Access & Permissions

- **Pricing Management Page:** `/admin/pricing`
- **Allowed Roles:** PROPERTY_MANAGER, SUPER_ADMIN
- **API Endpoint:** PATCH `/api/admin/room-types/[id]`

## Future Enhancements

Potential improvements to consider:
- Bulk pricing updates for multiple room types
- Pricing analytics and occupancy-based recommendations
- Historical pricing tracking
- Seasonal pricing presets
- Auto-generated pricing suggestions based on demand
