CREATE TABLE IF NOT EXISTS "dashboard_bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dashboard_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dashboard_bookmarks_dashboard_user_unique" UNIQUE("dashboard_id","user_id")
);--> statement-breakpoint
ALTER TABLE "dashboard_bookmarks" ADD CONSTRAINT "dashboard_bookmarks_dashboard_id_dashboards_id_fk" FOREIGN KEY ("dashboard_id") REFERENCES "public"."dashboards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_bookmarks" ADD CONSTRAINT "dashboard_bookmarks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
