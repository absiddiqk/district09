// Neon Postgres over HTTPS (no driver or npm install needed).
// Needs DATABASE_URL (Vercel's Neon integration adds it automatically).

function connectionString() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
}

function dbConfigured() {
  return /^postgres(ql)?:\/\//.test(connectionString());
}

async function query(sql, params = []) {
  const cs = connectionString();
  if (!dbConfigured()) throw new Error("db_not_configured");
  const host = new URL(cs).hostname;
  const response = await fetch(`https://${host}/sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Neon-Connection-String": cs,
      "Neon-Raw-Text-Output": "true"
    },
    body: JSON.stringify({ query: sql, params })
  });
  let data = {};
  try { data = await response.json(); } catch { /* handled below */ }
  if (!response.ok) throw new Error("db_error");
  return Array.isArray(data.rows) ? data.rows : [];
}

let schemaReady = null;
function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await query(`CREATE TABLE IF NOT EXISTS customers (
        id BIGSERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT,
        phone TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
        consent_at TIMESTAMPTZ,
        email_verified BOOLEAN NOT NULL DEFAULT FALSE,
        source TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_login_at TIMESTAMPTZ
      )`);
      await query(`CREATE TABLE IF NOT EXISTS login_codes (
        id BIGSERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        code_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        attempts INT NOT NULL DEFAULT 0,
        used BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
      await query(`CREATE INDEX IF NOT EXISTS login_codes_email_idx ON login_codes (email, created_at)`);
      await query(`CREATE TABLE IF NOT EXISTS orders (
        reference TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        phone_key TEXT,
        total_kobo BIGINT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
      await query(`CREATE INDEX IF NOT EXISTS orders_email_idx ON orders (email)`);
      await query(`CREATE INDEX IF NOT EXISTS orders_phone_idx ON orders (phone_key)`);
    })().catch(error => { schemaReady = null; throw error; });
  }
  return schemaReady;
}

const truthy = v => v === true || v === "t" || v === "true" || v === "1" || v === 1;

module.exports = { query, ensureSchema, dbConfigured, truthy };
