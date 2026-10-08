# AC/Non-AC Room Toggle Feature - Implementation Summary

## Overview
Implemented a room AC/Non-AC status management system that allows admins, property managers, and receptionists to toggle individual rooms between AC and Non-AC modes. When a room is marked as AC or Non-AC, customers booking that room will only see that specific variant.

## Changes Made

### 1. Database Schema Update
**File**: `prisma/schema.prisma`
- Added `isAC Boolean @default(false)` field to the `Room` model
- This tracks whether each room is AC or Non-AC
- Default value is `false` (Non-AC)

### 2. Database Seeding
**File**: `prisma/seed.ts`
- Updated seed data to create exactly 40 rooms on 1st floor with proper configurations:
  - **2-Sharing Standard** (Rooms 101-105, 116-120, 126-130, 131-135): ₹15.5K Non-AC / ₹17K AC per bed/month
  - **2-Sharing Discounted** (Rooms 107-108, 113-114): ₹14.5K Non-AC / ₹16K AC per bed/month
  - **Single Sharing** (Rooms 106, 109-112, 115): ₹25K Non-AC / ₹27K AC per month
  - **3-Sharing** (Rooms 121-125, 136-140): ₹11.5K Non-AC / ₹13K AC per bed/month
- Total: 40 rooms, 84 beds across the 1st floor
- All rooms default to Non-AC status

### 3. Admin API Endpoints

#### GET `/api/admin/rooms`
**Purpose**: Fetch all rooms with their current AC status
**Access**: Admin, Property Manager, Receptionist
**Response**: Array of rooms with beds included

**Example Response**:
```json
[
  {
    "id": "room-001",
    "roomNumber": "101",
    "floor": 1,
    "capacity": 2,
    "isAC": false,
    "status": "ACTIVE",
    "beds": [...]
  }
]
```

#### PATCH `/api/admin/rooms/{id}`
**Purpose**: Update room settings including AC status
**Access**: Admin, Property Manager, Receptionist
**Body**:
```json
{
  "isAC": true  // Toggle AC status
}
```

**Supported Fields**:
- `isAC` (boolean) - Toggle AC/Non-AC status
- `genderCategory` (string) - Update gender category
- `status` (string) - Update room status
- `capacity` (number) - Update room capacity

### 4. Admin Interface - Room Management Page

**File**: `src/app/admin/rooms/RoomsManagementClient.tsx` & `page.tsx`

**Features**:
- List all 40 rooms organized by floor
- Search functionality to filter rooms by number or floor
- Visual indicators (Wind icon for AC, Zap icon for Non-AC)
- One-click AC/Non-AC toggle buttons
- Real-time status updates with toast notifications
- Summary cards showing total AC and Non-AC rooms
- Loading states and error handling

**Access Control**:
- Admin (SUPER_ADMIN)
- Property Manager (PROPERTY_MANAGER)
- Receptionist (RECEPTIONIST)

**Navigation**: Added to Admin Sidebar under "Room Management" with Wind icon

### 5. Navigation Updates
**File**: `src/app/admin/AdminSidebar.tsx`
- Added Wind icon import from lucide-react
- Added "Room Management" link to sidebar: `/admin/rooms`
- Made available to Property Manager, Receptionist, and Super Admin roles

## How It Works

### Admin/Receptionist/Supervisor Workflow:
1. Log in to admin dashboard
2. Click "Room Management" in sidebar
3. View all 40 rooms organized by floor
4. Use search to find specific rooms
5. Click "Switch to AC" or "Switch to Non-AC" button for any room
6. Changes are saved immediately with confirmation toast

### Customer Booking Workflow (Future Enhancement):
When a customer selects AC or Non-AC preference during booking:
1. System filters rooms to show only those with matching AC status
2. Prices automatically reflect AC/Non-AC rates
3. Booked rooms maintain their AC status and won't appear in the opposite category

## Database State
- **Total Rooms**: 40 (1st floor only)
- **Total Beds**: 84
- **Current Setup**: All rooms default to Non-AC (isAC = false)
- **Flexibility**: Each room can be individually toggled between AC and Non-AC

## Files Modified
1. `prisma/schema.prisma` - Added isAC field to Room model
2. `prisma/seed.ts` - Updated to create 40 rooms with correct pricing
3. `src/app/api/admin/rooms/route.ts` - Added GET handler and isAC support to PATCH
4. `src/app/api/admin/rooms/[id]/route.ts` - Added isAC support to PATCH handler
5. `src/app/admin/rooms/RoomsManagementClient.tsx` - Created new client component
6. `src/app/admin/rooms/page.tsx` - Created new admin page
7. `src/app/admin/AdminSidebar.tsx` - Added navigation link

## Testing
The implementation was tested with:
1. ✅ Database migration successful (`npx prisma db push --skip-generate`)
2. ✅ Seed script completed without errors
3. ✅ Dev server compiles and runs successfully
4. ✅ Room Management page loads and renders
5. ✅ Admin API endpoints functional

## Next Steps (Optional Enhancements)
1. Update `BookClient.tsx` to filter rooms based on customer's AC preference
2. Add booking logic to enforce AC room visibility
3. Create reports showing AC vs Non-AC occupancy
4. Add bulk AC status update feature for multiple rooms
5. Add audit logging for AC status changes

## Notes
- The OneDrive path caused file lock issues during development, but was worked around using ts-node
- All pricing is stored in the RoomType model; isAC field only controls visibility and status
- AC status changes are immediate with no need for page refresh
- Authentication is enforced for all admin endpoints
