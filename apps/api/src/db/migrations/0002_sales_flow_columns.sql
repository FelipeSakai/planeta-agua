ALTER TABLE "sales" ADD COLUMN "bottle_month" integer;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "bottle_year" integer;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "bottle_notes" text;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "canceled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "canceled_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "cancellation_reason" text;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_canceled_by_user_id_users_id_fk" FOREIGN KEY ("canceled_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
