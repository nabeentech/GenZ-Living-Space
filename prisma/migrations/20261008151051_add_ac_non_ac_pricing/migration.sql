-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Room" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hostelId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "building" TEXT NOT NULL DEFAULT 'Block A',
    "floor" INTEGER NOT NULL DEFAULT 1,
    "roomNumber" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "genderCategory" TEXT NOT NULL DEFAULT 'MIXED',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isAC" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Room_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "Hostel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Room_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Room" ("active", "building", "capacity", "createdAt", "floor", "genderCategory", "hostelId", "id", "roomNumber", "roomTypeId", "status", "updatedAt") SELECT "active", "building", "capacity", "createdAt", "floor", "genderCategory", "hostelId", "id", "roomNumber", "roomTypeId", "status", "updatedAt" FROM "Room";
DROP TABLE "Room";
ALTER TABLE "new_Room" RENAME TO "Room";
CREATE TABLE "new_RoomType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "totalBeds" INTEGER NOT NULL DEFAULT 2,
    "genderCategory" TEXT NOT NULL DEFAULT 'MIXED',
    "pricePerDayNonAC" REAL,
    "price7DaysNonAC" REAL,
    "price10DaysNonAC" REAL,
    "price15DaysNonAC" REAL,
    "price30DaysNonAC" REAL,
    "pricePerDayAC" REAL,
    "price7DaysAC" REAL,
    "price10DaysAC" REAL,
    "price15DaysAC" REAL,
    "price30DaysAC" REAL,
    "basePrice" REAL,
    "monthlyPrice" REAL,
    "weeklyDiscountPct" REAL NOT NULL DEFAULT 10.0,
    "securityDeposit" REAL NOT NULL DEFAULT 3000.0,
    "images" TEXT NOT NULL DEFAULT '[]',
    "amenities" TEXT NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_RoomType" ("active", "amenities", "basePrice", "createdAt", "description", "genderCategory", "id", "images", "monthlyPrice", "name", "securityDeposit", "slug", "totalBeds", "updatedAt", "weeklyDiscountPct") SELECT "active", "amenities", "basePrice", "createdAt", "description", "genderCategory", "id", "images", "monthlyPrice", "name", "securityDeposit", "slug", "totalBeds", "updatedAt", "weeklyDiscountPct" FROM "RoomType";
DROP TABLE "RoomType";
ALTER TABLE "new_RoomType" RENAME TO "RoomType";
CREATE UNIQUE INDEX "RoomType_slug_key" ON "RoomType"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
