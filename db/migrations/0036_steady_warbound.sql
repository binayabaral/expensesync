CREATE TABLE "ai_organization_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"data" jsonb NOT NULL,
	"model" text NOT NULL,
	"tier" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_aorgr_user_id" ON "ai_organization_reports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_aorgr_user_created" ON "ai_organization_reports" USING btree ("user_id","created_at");