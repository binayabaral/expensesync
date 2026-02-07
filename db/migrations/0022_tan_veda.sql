CREATE TYPE "public"."account_type" AS ENUM('CASH', 'BANK', 'CREDIT_CARD', 'LOAN', 'OTHER');--> statement-breakpoint
CREATE TABLE "credit_card_statements" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"period_start" timestamp NOT NULL,
	"statement_date" timestamp NOT NULL,
	"due_date" timestamp NOT NULL,
	"statement_balance" bigint NOT NULL,
	"payment_due_amount" bigint NOT NULL,
	"is_payment_due_overridden" boolean DEFAULT false NOT NULL,
	"minimum_payment" bigint NOT NULL,
	"paid_amount" bigint DEFAULT 0 NOT NULL,
	"is_paid" boolean DEFAULT false NOT NULL,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "account_type" "account_type" DEFAULT 'CASH' NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "credit_limit" bigint;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "apr" double precision;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "statement_close_day" integer;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "statement_close_is_eom" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "payment_due_day" integer;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "payment_due_days" integer;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "minimum_payment_percentage" double precision DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "transfers" ADD COLUMN "credit_card_statement_id" text;--> statement-breakpoint
ALTER TABLE "credit_card_statements" ADD CONSTRAINT "credit_card_statements_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_credit_card_statement_id_credit_card_statements_id_fk" FOREIGN KEY ("credit_card_statement_id") REFERENCES "public"."credit_card_statements"("id") ON DELETE set null ON UPDATE no action;