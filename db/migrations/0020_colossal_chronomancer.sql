CREATE TYPE "public"."recurring_cadence" AS ENUM('DAILY', 'MONTHLY', 'YEARLY');--> statement-breakpoint
CREATE TYPE "public"."recurring_payment_type" AS ENUM('TRANSACTION', 'TRANSFER');--> statement-breakpoint
CREATE TABLE "recurring_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"type" "recurring_payment_type" NOT NULL,
	"cadence" "recurring_cadence" NOT NULL,
	"amount" bigint NOT NULL,
	"account_id" text,
	"category_id" text,
	"to_account_id" text,
	"notes" text,
	"start_date" timestamp NOT NULL,
	"day_of_month" integer,
	"month" integer,
	"last_completed_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "recurring_payments" ADD CONSTRAINT "recurring_payments_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_payments" ADD CONSTRAINT "recurring_payments_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_payments" ADD CONSTRAINT "recurring_payments_to_account_id_accounts_id_fk" FOREIGN KEY ("to_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;