// Newsletter box: save the email (and name if given) as a subscriber. Not email-verified until they sign in.
const { query, ensureSchema, dbConfigured } = require("../_lib/db");
const { reply, body, cleanEmail, clip } = require("../_lib/http");

module.exports = async (req, res) => {
  if (req.method !== "POST") return reply(res, 405, { error: "Method not allowed." });
  if (!dbConfigured()) return reply(res, 200, { ok: true, saved: false });
  const input = body(req);
  if (input._honey) return reply(res, 200, { ok: true });
  const email = cleanEmail(input.email);
  if (!email) return reply(res, 400, { error: "Please enter a valid email address." });
  try {
    await ensureSchema();
    await query(
      `INSERT INTO customers (email, name, marketing_consent, consent_at, source)
       VALUES ($1, NULLIF($2, ''), TRUE, NOW(), 'newsletter')
       ON CONFLICT (email) DO UPDATE SET
         marketing_consent = TRUE,
         consent_at = COALESCE(customers.consent_at, NOW()),
         name = COALESCE(customers.name, EXCLUDED.name)`,
      [email, clip(input.name, 100)]);
    return reply(res, 200, { ok: true, saved: true });
  } catch (error) {
    return reply(res, 200, { ok: true, saved: false });
  }
};
