ALTER TABLE "agent_tasks" ADD COLUMN "source_agent_type" text;--> statement-breakpoint
ALTER TABLE "agent_tasks" ADD COLUMN "target_agent_type" text;--> statement-breakpoint
ALTER TABLE "agent_tasks" ADD COLUMN "delegation_status" text;--> statement-breakpoint
ALTER TABLE "agent_tasks" ADD COLUMN "delegation_result" text;