CREATE TYPE "public"."split_type" AS ENUM('EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES');--> statement-breakpoint
ALTER TYPE "public"."account_type" ADD VALUE 'BILL_SPLIT';--> statement-breakpoint
CREATE TABLE "split_contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"created_by_user_id" text NOT NULL,
	"linked_user_id" text,
	"email" text,
	"name" text NOT NULL,
	"virtual_account_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "split_expense_shares" (
	"id" text PRIMARY KEY NOT NULL,
	"expense_id" text NOT NULL,
	"contact_id" text,
	"is_user" boolean DEFAULT false NOT NULL,
	"share_amount" bigint NOT NULL,
	"split_value" double precision NOT NULL,
	"transaction_id" text
);
--> statement-breakpoint
CREATE TABLE "split_expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"created_by_user_id" text NOT NULL,
	"group_id" text,
	"description" text NOT NULL,
	"total_amount" bigint NOT NULL,
	"currency" "currency" DEFAULT 'NPR' NOT NULL,
	"date" timestamp NOT NULL,
	"paid_by_contact_id" text,
	"paid_by_user" boolean DEFAULT false NOT NULL,
	"category_id" text,
	"split_type" "split_type" NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "split_group_members" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"user_id" text,
	"virtual_account_id" text,
	"added_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "split_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"created_by_user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"currency" "currency" DEFAULT 'NPR' NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"simplify_debts" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "split_settlements" (
	"id" text PRIMARY KEY NOT NULL,
	"created_by_user_id" text NOT NULL,
	"group_id" text,
	"from_is_user" boolean DEFAULT false NOT NULL,
	"from_contact_id" text,
	"to_is_user" boolean DEFAULT false NOT NULL,
	"to_contact_id" text,
	"amount" bigint NOT NULL,
	"currency" "currency" DEFAULT 'NPR' NOT NULL,
	"date" timestamp NOT NULL,
	"transaction_id" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "split_contacts" ADD CONSTRAINT "split_contacts_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_contacts" ADD CONSTRAINT "split_contacts_linked_user_id_users_id_fk" FOREIGN KEY ("linked_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_contacts" ADD CONSTRAINT "split_contacts_virtual_account_id_accounts_id_fk" FOREIGN KEY ("virtual_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_expense_shares" ADD CONSTRAINT "split_expense_shares_expense_id_split_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."split_expenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_expense_shares" ADD CONSTRAINT "split_expense_shares_contact_id_split_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."split_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_expense_shares" ADD CONSTRAINT "split_expense_shares_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_expenses" ADD CONSTRAINT "split_expenses_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_expenses" ADD CONSTRAINT "split_expenses_group_id_split_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."split_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_expenses" ADD CONSTRAINT "split_expenses_paid_by_contact_id_split_contacts_id_fk" FOREIGN KEY ("paid_by_contact_id") REFERENCES "public"."split_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_expenses" ADD CONSTRAINT "split_expenses_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_group_members" ADD CONSTRAINT "split_group_members_group_id_split_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."split_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_group_members" ADD CONSTRAINT "split_group_members_contact_id_split_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."split_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_group_members" ADD CONSTRAINT "split_group_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_group_members" ADD CONSTRAINT "split_group_members_virtual_account_id_accounts_id_fk" FOREIGN KEY ("virtual_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_groups" ADD CONSTRAINT "split_groups_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_settlements" ADD CONSTRAINT "split_settlements_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_settlements" ADD CONSTRAINT "split_settlements_group_id_split_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."split_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_settlements" ADD CONSTRAINT "split_settlements_from_contact_id_split_contacts_id_fk" FOREIGN KEY ("from_contact_id") REFERENCES "public"."split_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_settlements" ADD CONSTRAINT "split_settlements_to_contact_id_split_contacts_id_fk" FOREIGN KEY ("to_contact_id") REFERENCES "public"."split_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_settlements" ADD CONSTRAINT "split_settlements_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;