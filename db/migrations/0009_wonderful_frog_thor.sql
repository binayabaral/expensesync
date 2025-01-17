CREATE TYPE "public"."transfer_type" AS ENUM('SELF_TRANSFER', 'PEER_TRANSFER');--> statement-breakpoint
ALTER TABLE "transfers" ALTER COLUMN "from_account_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "transfers" ALTER COLUMN "to_account_id" DROP NOT NULL;