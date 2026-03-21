import pg from "pg";

const migrations = [
  `CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    owner_id INTEGER NOT NULL REFERENCES users(id),
    logo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS organization_members (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS organization_invites (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    token TEXT NOT NULL UNIQUE,
    invited_by_id INTEGER NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id INTEGER`,
  `ALTER TABLE rentals ADD COLUMN IF NOT EXISTS organization_id INTEGER`,
  `ALTER TABLE agent_documents ADD COLUMN IF NOT EXISTS organization_id INTEGER`,
  `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS organization_id INTEGER`,
  `ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS organization_id INTEGER`,
  `ALTER TABLE rex_contacts ADD COLUMN IF NOT EXISTS organization_id INTEGER`,
  `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS slug TEXT NOT NULL UNIQUE DEFAULT ''`,
];

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log("[migrate] No DATABASE_URL found, skipping migrations");
    return;
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  let failures = 0;

  try {
    await client.connect();
    console.log("[migrate] Connected to database, running migrations...");

    for (let i = 0; i < migrations.length; i++) {
      try {
        await client.query(migrations[i]);
        console.log(`[migrate] ✓ Migration ${i + 1}/${migrations.length} applied`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("already exists")) {
          console.log(`[migrate] ⊘ Migration ${i + 1}/${migrations.length} skipped (already exists)`);
        } else {
          console.error(`[migrate] ✗ Migration ${i + 1}/${migrations.length} FAILED: ${msg}`);
          failures++;
        }
      }
    }

    if (failures > 0) {
      console.error(`[migrate] ${failures} migration(s) failed!`);
      process.exit(1);
    }

    console.log("[migrate] All migrations complete successfully");
  } catch (err) {
    console.error("[migrate] Database connection failed:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
