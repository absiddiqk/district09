// Setup check: reports only whether each piece is configured/working (no secrets, no data).
const { query, ensureSchema, dbConfigured } = require("../_lib/db");
const { secret } = require("../_lib/session");
const { mailConfigured } = require("../_lib/mailer");
const { reply } = require("../_lib/http");

module.exports = async (req, res) => {
  const out = { database_configured: dbConfigured(), database_working: false, session_secret_set: Boolean(secret()), email_configured: mailConfigured(), admin_token_set: Boolean(process.env.ADMIN_TOKEN && process.env.ADMIN_TOKEN.length >= 16) };
  if (out.database_configured) {
    try { await ensureSchema(); await query("SELECT 1"); out.database_working = true; } catch { /* stays false */ }
  }
  return reply(res, 200, out);
};
