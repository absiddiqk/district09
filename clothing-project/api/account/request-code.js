// Step 1 of sign in / sign up: email a 6-digit code. Same flow for new and returning customers.
const crypto = require("node:crypto");
const { query, ensureSchema, dbConfigured } = require("../_lib/db");
const { secret, hashCode } = require("../_lib/session");
const { sendLoginCode, mailConfigured } = require("../_lib/mailer");
const { reply, body, cleanEmail } = require("../_lib/http");

module.exports = async (req, res) => {
  if (req.method !== "POST") return reply(res, 405, { error: "Method not allowed." });
  if (!dbConfigured() || !secret() || !mailConfigured()) {
    return reply(res, 503, { error: "Sign in is being set up and isn't available yet. Please try again soon." });
  }
  const input = body(req);
  if (input._honey) return reply(res, 200, { ok: true });
  const email = cleanEmail(input.email);
  if (!email) return reply(res, 400, { error: "Please enter a valid email address." });

  try {
    await ensureSchema();
    const recent = await query(
      `SELECT
         COUNT(*) FILTER (WHERE email = $1 AND created_at > NOW() - INTERVAL '60 seconds') AS last_minute,
         COUNT(*) FILTER (WHERE email = $1 AND created_at > NOW() - INTERVAL '1 hour') AS last_hour,
         COUNT(*) AS all_hour
       FROM login_codes WHERE created_at > NOW() - INTERVAL '1 hour'`, [email]);
    const r = recent[0] || {};
    if (Number(r.last_minute) > 0) return reply(res, 429, { error: "A code was just sent. Please wait a minute before asking for another." });
    if (Number(r.last_hour) >= 5 || Number(r.all_hour) >= 300) return reply(res, 429, { error: "Too many attempts. Please try again later." });

    const code = String(crypto.randomInt(100000, 1000000));
    await query(
      `INSERT INTO login_codes (email, code_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '10 minutes')`,
      [email, hashCode(email, code)]);
    await sendLoginCode(email, code);
    return reply(res, 200, { ok: true });
  } catch (error) {
    return reply(res, 502, { error: "We couldn't send your code. Please try again in a moment." });
  }
};
