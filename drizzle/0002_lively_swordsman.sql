DO $$ BEGIN
    CREATE TYPE "public"."billing_frequency" AS ENUM('monthly', 'yearly');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "billing_frequency" "billing_frequency" DEFAULT 'monthly' NOT NULL;