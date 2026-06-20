ALTER TYPE "public"."sale_status" ADD VALUE 'PENDING_DELIVERY';--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "code" text;--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN "discount_cents" integer;--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN "final_unit_price_cents" integer;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "delivered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "delivered_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_delivered_by_user_id_users_id_fk" FOREIGN KEY ("delivered_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;