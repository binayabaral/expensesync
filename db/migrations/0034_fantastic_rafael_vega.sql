CREATE TABLE "ai_recommendations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"data" jsonb NOT NULL,
	"model" text NOT NULL,
	"tier" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_air_user_id" ON "ai_recommendations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_air_user_created" ON "ai_recommendations" USING btree ("user_id","created_at");