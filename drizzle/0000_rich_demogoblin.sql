CREATE TABLE "gpu_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer NOT NULL,
	"model" text NOT NULL,
	"vram_gb" integer,
	"hourly_usd" numeric(10, 4) NOT NULL,
	"region" text,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "providers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "gpu_prices" ADD CONSTRAINT "gpu_prices_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gpu_prices_provider_idx" ON "gpu_prices" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "gpu_prices_model_idx" ON "gpu_prices" USING btree ("model");--> statement-breakpoint
CREATE INDEX "providers_slug_idx" ON "providers" USING btree ("slug");