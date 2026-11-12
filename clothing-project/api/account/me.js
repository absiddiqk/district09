// GET: who is signed in.  POST: save profile.  DELETE: delete the account and its data.
const { query, ensureSchema, dbConfigured, truthy } = require("../_lib/db");
const { secret, getSession, clearSession } = require("../_lib/session");
const { reply, body, clip } = require("../_lib/http");
const { mailConfigured } = require("../_lib/mailer");
const { publicCustomer } = require("../_lib/customer");

module.exports = async (req, res) => {
  if (!dbConfigured() || !secret() || !mailConfigured()) {
    if (req.method === "GET" && dbConfigured() && secret()) { const s0 = getSession(req); if (s0) { try { await ensureSchema(); const r0 = await query(`SELECT * FROM customers WHERE id = $1`, [s0.id]); if (r0[0]) return reply(res, 200, { customer: publicCustomer(r0[0]), available: true }); } catch { /* fall through */ } } }
    return req.method === "GET" ? reply(res, 200, { customer: null, available: false }) : reply(res, 503, { error: "Accounts aren't available yet." });
  }
  const session = getSession(req);
  if (!session) return req.method === "GET" ? reply(res, 200, { customer: null, available: true }) : reply(res, 401, { error: "Please sign in first." });

  try {
    await ensureSchema();
    if (req.method === "GET") {
      const rows = await query(`SELECT * FROM customers WHERE id = $1`, [session.id]);
      if (!rows[0]) { clearSession(res); return reply(res, 200, { customer: null, available: true }); }
      return reply(res, 200, { customer: publicCustomer(rows[0]), available: true });
    }

    if (req.method === "POST") {
      const input = body(req);
      const name = clip(input.name, 100);
      if (!name) return reply(res, 400, { error: "Please enter your name." });
      const phone = clip(input.phone, 25);
      if (phone && !/^[+0-9\s\-()]{7,25}$/.test(phone)) return reply(res, 400, { error: "Please enter a valid phone number." });
      const consent = input.marketing_consent === true || input.marketing_consent === "true";
      const rows = await query(
        `UPDATE customers SET name = $2, phone = $3, address = $4, city = $5, state = $6,
           marketing_consent = $7,
           consent_at = CASE WHEN $7 AND NOT marketing_consent THEN NOW() WHEN NOT $7 THEN NULL ELSE consent_at END
         WHERE id = $1 RETURNING *`,
        [session.id, name, phone, clip(input.address, 300), clip(input.city, 100), clip(input.state, 60), consent]);
      if (!rows[0]) return reply(res, 404, { error: "Account not found." });
      return reply(res, 200, { customer: publicCustomer(rows[0]) });
    }

    if (req.method === "DELETE") {
      await query(`DELETE FROM customers WHERE id = $1`, [session.id]);
      clearSession(res);
      return reply(res, 200, { ok: true });
    }
    return reply(res, 405, { error: "Method not allowed." });
  } catch (error) {
    return reply(res, 502, { error: "Something went wrong. Please try again." });
  }
};
