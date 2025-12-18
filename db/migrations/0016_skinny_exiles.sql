CREATE TABLE "asset_lots" (
	"id" text PRIMARY KEY NOT NULL,
	"asset_id" text NOT NULL,
	"quantity" double precision NOT NULL,
	"unit" text NOT NULL,
	"asset_price" bigint NOT NULL,
	"extra_charge" bigint DEFAULT 0 NOT NULL,
	"total_paid" bigint NOT NULL,
	"account_id" text NOT NULL,
	"buy_transaction_id" text,
	"date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "asset_lots" ADD CONSTRAINT "asset_lots_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_lots" ADD CONSTRAINT "asset_lots_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_lots" ADD CONSTRAINT "asset_lots_buy_transaction_id_transactions_id_fk" FOREIGN KEY ("buy_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;