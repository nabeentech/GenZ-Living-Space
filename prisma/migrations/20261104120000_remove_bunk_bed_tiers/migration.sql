-- Beds are identified by their numbered bed label. Preserve only the occupancy
-- distinction used by double beds; remove legacy bunk position values.
UPDATE "Bed"
SET "tier" = 'SINGLE'
WHERE "tier" IN ('LOWER_BUNK', 'UPPER_BUNK');

ALTER TABLE "Bed" ALTER COLUMN "tier" SET DEFAULT 'SINGLE';
