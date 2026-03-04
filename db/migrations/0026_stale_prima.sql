CREATE TYPE "public"."currency" AS ENUM('NPR', 'USD', 'EUR', 'GBP', 'CHF', 'AUD', 'CAD', 'SGD', 'JPY', 'CNY', 'SAR', 'QAR', 'THB', 'AED', 'MYR', 'KRW', 'SEK', 'DKK', 'HKD', 'KWD', 'BHD', 'OMR');--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "currency" "currency" DEFAULT 'NPR' NOT NULL;--> statement-breakpoint
ALTER TABLE "transfers" ADD COLUMN "to_amount" integer;