CREATE TABLE "asset_prices" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "asset_type" NOT NULL,
	"unit" text NOT NULL,
	"price" bigint NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL
);
