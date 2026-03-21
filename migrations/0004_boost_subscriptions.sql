-- Boost Mode: Parallel task system for agents
CREATE TABLE IF NOT EXISTS "boost_subscriptions" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "boost_plan" text NOT NULL,
  "max_parallel_tasks" integer NOT NULL DEFAULT 3,
  "status" text NOT NULL DEFAULT 'active',
  "stripe_boost_sub_id" text,
  "expires_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add boost tracking columns to conversations
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "is_boost_task" boolean NOT NULL DEFAULT false;
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "boost_status" text NOT NULL DEFAULT 'idle';
