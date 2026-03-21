-- Organization infrastructure migration
-- Creates organizations, organization_members, and organization_invites tables
-- Adds organizationId columns to users, rentals, conversations, rex_contacts, agent_documents, crm_documents

DO $$ BEGIN
  CREATE TYPE "org_role" AS ENUM ('owner', 'admin', 'member', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "organizations" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "owner_id" integer NOT NULL REFERENCES "users"("id"),
  "logo_url" text,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "organization_members" (
  "id" serial PRIMARY KEY,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" "org_role" NOT NULL DEFAULT 'member',
  "joined_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE ("organization_id", "user_id")
);

CREATE TABLE IF NOT EXISTS "organization_invites" (
  "id" serial PRIMARY KEY,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "email" text NOT NULL,
  "role" "org_role" NOT NULL DEFAULT 'member',
  "token" text NOT NULL UNIQUE,
  "status" text NOT NULL DEFAULT 'pending',
  "invited_by_id" integer NOT NULL REFERENCES "users"("id"),
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add organizationId to existing tables (nullable, backward compatible)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "organization_id" integer;
ALTER TABLE "rentals" ADD COLUMN IF NOT EXISTS "organization_id" integer;
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "organization_id" integer;
ALTER TABLE "rex_contacts" ADD COLUMN IF NOT EXISTS "organization_id" integer;
ALTER TABLE "agent_documents" ADD COLUMN IF NOT EXISTS "organization_id" integer;
ALTER TABLE "agent_documents" ADD COLUMN IF NOT EXISTS "user_id" integer REFERENCES "users"("id");
ALTER TABLE "crm_documents" ADD COLUMN IF NOT EXISTS "organization_id" integer;
