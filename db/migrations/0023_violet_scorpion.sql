CREATE TYPE "public"."loan_sub_type" AS ENUM('EMI', 'PEER');--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "loan_sub_type" "loan_sub_type";--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "peer_name" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "loan_tenure_months" integer;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "is_closed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "closed_at" date;