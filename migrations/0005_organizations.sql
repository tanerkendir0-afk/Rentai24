-- Organization management: organizations, org_members, org_invitations
CREATE TABLE IF NOT EXISTS "organizations" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "logo_url" text,
  "owner_id" integer NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "org_members" (
  "id" serial PRIMARY KEY NOT NULL,
  "org_id" integer NOT NULL REFERENCES "organizations"("id"),
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "role" text NOT NULL DEFAULT 'member',
  "joined_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "org_invitations" (
  "id" serial PRIMARY KEY NOT NULL,
  "org_id" integer NOT NULL REFERENCES "organizations"("id"),
  "email" text NOT NULL,
  "role" text NOT NULL DEFAULT 'member',
  "token" text NOT NULL UNIQUE,
  "invited_by" integer NOT NULL REFERENCES "users"("id"),
  "status" text NOT NULL DEFAULT 'pending',
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
