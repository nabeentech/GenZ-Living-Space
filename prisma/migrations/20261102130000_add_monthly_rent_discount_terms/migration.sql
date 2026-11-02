ALTER TABLE "Booking" ADD COLUMN "monthlyRentDiscountAmount" REAL NOT NULL DEFAULT 0.0;
ALTER TABLE "Booking" ADD COLUMN "monthlyRentDiscountMonths" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Booking" ADD COLUMN "monthlyRentDiscountCyclesApplied" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN "monthlyRentDiscountAmount" REAL NOT NULL DEFAULT 0.0;
