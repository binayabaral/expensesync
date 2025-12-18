CREATE TYPE "public"."asset_type" AS ENUM('GOLD_22K', 'GOLD_24K', 'SILVER', 'STOCK', 'SIP', 'OTHER');--> statement-breakpoint
ALTER TYPE "public"."transaction_type" ADD VALUE 'ASSET_BUY';--> statement-breakpoint
ALTER TYPE "public"."transaction_type" ADD VALUE 'ASSET_RETURN';--> statement-breakpoint
ALTER TYPE "public"."transaction_type" ADD VALUE 'ASSET_SELL';--> statement-breakpoint
CREATE TABLE "assets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"type" "asset_type" NOT NULL,
	"quantity" integer NOT NULL,
	"unit" text NOT NULL,
	"asset_price" bigint NOT NULL,
	"extra_charge" bigint DEFAULT 0 NOT NULL,
	"total_paid" bigint NOT NULL,
	"account_id" text NOT NULL,
	"buy_transaction_id" text,
	"sell_transaction_id" text,
	"is_sold" boolean DEFAULT false NOT NULL,
	"sold_at" timestamp,
	"sell_amount" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_buy_transaction_id_transactions_id_fk" FOREIGN KEY ("buy_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_sell_transaction_id_transactions_id_fk" FOREIGN KEY ("sell_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;