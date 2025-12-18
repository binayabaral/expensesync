ALTER TABLE "public"."assets" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."asset_type";--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('GOLD_22K', 'GOLD_24K', 'SILVER', 'STOCK');--> statement-breakpoint
ALTER TABLE "public"."assets" ALTER COLUMN "type" SET DATA TYPE "public"."asset_type" USING "type"::"public"."asset_type";