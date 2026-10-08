# Quick Reference: Simplified 3-Room Pricing System

## Room Types Summary

| Room Type | Capacity | Non-AC (1-day) | AC (1-day) | Non-AC (Monthly) | AC (Monthly) |
|-----------|----------|----------------|-----------|------------------|--------------|
| **Twin Sharing Pod Room** | 2 beds | ₹1,099 | ₹1,299 | ₹23,999 | ₹27,999 |
| **Triple Sharing** | 3 beds | ₹499 | ₹599 | ₹11,499 | ₹13,499 |
| **Private Creator Studio** | 1 bed | ₹1,999 | ₹2,299 | ₹37,999 | ₹42,999 |

## Room Distribution (40 Total)

- **Rooms 101-120:** Twin Sharing Pod Room (20 rooms)
- **Rooms 121-130:** Triple Sharing (10 rooms)
- **Rooms 131-140:** Private Creator Studio (10 rooms)

## Pricing Tiers

Each room type has 5 booking duration tiers:

| Duration | Field Name | Example (Twin Non-AC) |
|----------|------------|----------------------|
| 1 Day | `pricePerDay[AC/NonAC]` | ₹1,099 |
| 7 Days | `price7Days[AC/NonAC]` | ₹7,090 |
| 10 Days | `price10Days[AC/NonAC]` | ₹10,190 |
| 15 Days | `price15Days[AC/NonAC]` | ₹15,285 |
| 30+ Days | `price30Days[AC/NonAC]` | ₹23,999 |

## Admin Features

### Access Pricing Management
1. Go to **Admin Panel** → **Pricing Management**
2. Or directly visit: `/admin/pricing`

### Edit Pricing
1. **Click** on any room type card to expand
2. Update prices in AC and Non-AC sections
3. Click **"Save Pricing"** button
4. Confirm success notification

### What You Can Update
- **Non-AC Pricing:** 5 fields (1-day, 7-day, 10-day, 15-day, 30-day)
- **AC Pricing:** 5 fields (1-day, 7-day, 10-day, 15-day, 30-day)

## Database Schema

### RoomType Fields (New)
```
// Non-AC Pricing
pricePerDayNonAC      Float?
price7DaysNonAC       Float?
price10DaysNonAC      Float?
price15DaysNonAC      Float?
price30DaysNonAC      Float?

// AC Pricing
pricePerDayAC         Float?
price7DaysAC          Float?
price10DaysAC         Float?
price15DaysAC         Float?
price30DaysAC         Float?
```

### Room Fields (Existing)
```
isAC: Boolean  // true = AC, false = Non-AC
roomNumber: String  // e.g., "101", "120"
capacity: Int  // Beds in room (1, 2, or 3)
```

## Workflow: Customer Booking

1. Customer selects room type & dates
2. System calculates stay duration
3. System selects pricing tier based on duration
4. System checks room's `isAC` status
5. System applies AC or Non-AC pricing
6. Price displayed to customer

## Workflow: Admin Update

1. Admin navigates to `/admin/pricing`
2. Expands room type card
3. Updates prices in desired fields
4. Clicks "Save Pricing"
5. API updates database
6. Changes instantly apply to all future bookings

## Important Notes

- ✅ All 40 rooms automatically assigned to correct room type
- ✅ AC/Non-AC determined by even/odd room numbers
- ✅ Each tier has independent pricing
- ✅ Changes save instantly via API
- ✅ Old `basePrice` & `monthlyPrice` deprecated (fallbacks in place)

## Troubleshooting

### Pricing not updating?
- Ensure you have PROPERTY_MANAGER or SUPER_ADMIN role
- Check browser console for API errors
- Verify room type exists in database

### Room showing wrong pricing?
- Check if room's `isAC` status is correct
- Verify pricing tiers are set for that booking duration
- Check room type assignment

### Can't access pricing page?
- Confirm you're logged in
- Verify your role (must be PROPERTY_MANAGER or SUPER_ADMIN)
- Check URL: `/admin/pricing`

## Development Notes

- **Frontend:** React hooks with real-time state
- **Backend:** Prisma ORM for database operations
- **API:** RESTful PATCH endpoint for updates
- **UI:** Expandable cards with separate AC/Non-AC sections
- **Validation:** Type-safe with TypeScript
- **Error Handling:** Try-catch with user-friendly notifications

## Files Modified

1. `prisma/schema.prisma` - Added AC/Non-AC pricing fields
2. `prisma/seed.ts` - 3 room types, 40 rooms, pricing data
3. `src/app/admin/pricing/page.tsx` - New pricing page
4. `src/app/admin/pricing/PricingManagementClient.tsx` - Pricing UI
5. `src/app/admin/AdminSidebar.tsx` - Added navigation link
6. `src/app/api/admin/room-types/[id]/route.ts` - Updated PATCH endpoint
7. Multiple booking files - Fixed null-check for basePrice/monthlyPrice

## Current Status

✅ **LIVE AND WORKING**
- Dev Server: http://localhost:3003
- Build: Passing
- Database: Seeded with 40 rooms, 3 types
- Admin UI: Fully functional
- API: Ready to use
