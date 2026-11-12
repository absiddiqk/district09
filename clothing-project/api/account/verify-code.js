// Step 2: check the code, create the customer if new, start a session.
const { query, ensureSchema, dbConfigured, truthy } = require("../_lib/db");
const { secret, hashCode, safeEqual, setSession } = require("../_lib/session");
const { reply, body, cleanEmail } = require("../_lib/http");
const { publicCustomer } = require("../_lib/customer");

module.exports = async (req, res) => {
  if (req.method !== "POST") return reply(res, 405, { error: "Method not allowed." });
  if (!dbConfigured() || !secret()) return reply(res, 503, { error: "Sign in is being set up and isn't available yet." });
  const input = body(req);
  const email = cleanEmail(input.email);
  const code = String(input.code || "").replace(/\s+/g, "");
  if (!email || !/^\d{6}$/.test(code)) return reply(res, 400, { error: "Enter the 6-digit code from your email." });

  try {
    await ensureSchema();
    const rows = await query(
      `SELECT id, code_hash, attempts FROM login_codes
       WHERE email = $1 AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`, [email]);
    const row = rows[0];
    if (!row || Number(row.attempts) >= 5) return reply(res, 400, { error: "That code has expired. Please ask for a new one." });

    await query(`UPDATE login_codes SET attempts = attempts + 1 WHERE id = $1`, [row.id]);
    if (!safeEqual(row.code_hash, hashCode(email, code))) return reply(res, 400, { error: "That code isn't right. Please check it and try again." });

    await query(`UPDATE login_codes SET used = TRUE WHERE id = $1`, [row.id]);
    const saved = await query(
      `INSERT INTO customers (email, email_verified, source, last_login_at)
       VALUES ($1, TRUE, 'signup', NOW())
       ON CONFLICT (email) DO UPDATE SET email_verified = TRUE, last_login_at = NOW()
       RETURNING *, (xmax = 0) AS inserted`, [email]);
    const customer = saved[0];
    setSession(res, customer.id);
    return reply(res, 200, { customer: publicCustomer(customer), isNew: truthy(customer.inserted) });
  } catch (error) {
    return reply(res, 502, { error: "We couldn't check your code. Please try again." });
  }
};
