-- AlterTable: add apiKey column to Store
-- First add as nullable to handle existing rows
ALTER TABLE "Store" ADD COLUMN "apiKey" TEXT;

-- Populate existing rows with a unique cuid-like value
UPDATE "Store" SET "apiKey" = gen_random_uuid()::text WHERE "apiKey" IS NULL;

-- Now make it required and add unique constraint
ALTER TABLE "Store" ALTER COLUMN "apiKey" SET NOT NULL;
ALTER TABLE "Store" ADD CONSTRAINT "Store_apiKey_key" UNIQUE ("apiKey");
