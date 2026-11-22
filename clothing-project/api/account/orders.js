// GET: the signed-in customer's paid orders. There is no order database, so this asks Paystack
// for successful payments made with the customer's verified email and returns only order details.
const { query, ensureSchema, dbConfigured } = require("../_lib/db");
const { secret, getSession } = require("../_lib/session");
const { reply } = require("../_lib/http");

function meta(v) {
  if (v && typeof v === "object") return v;
  try { const p = JSON.parse(v); return p && typeof p === "object" ? p : {}; } catch { return {}; }
}

async function paystack(path, key) {
  const r = await fetch("https://api.paystack.co" + path, { headers: { Authorization: `Bearer ${key}`, Accept: "application/json" }, signal: AbortSignal.timeout(15000) });
  if (r.status === 404) return null;
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.status !== true) throw new Error("paystack_error");
  return j.data;
}

module.exports = async (req, res) => {
  if (req.method !== "GET") return reply(res, 405, { error: "Method not allowed." });
  if (!dbConfigured() || !secret()) return reply(res, 503, { error: "Accounts aren't available yet." });
  const session = getSession(req);
  if (!session) return reply(res, 401, { error: "Please sign in first." });
  const key = process.env.PAYSTACK_SECRET_KEY || "";
  if (!/^sk_(test|live)_/.test(key)) return reply(res, 503, { error: "Orders are temporarily unavailable." });

  try {
    await ensureSchema();
    const rows = await query(`SELECT email FROM customers WHERE id = $1`, [session.id]);
    if (!rows[0]) return reply(res, 401, { error: "Please sign in first." });
    const email = String(rows[0].email).trim().toLowerCase();

    const customer = await paystack(`/customer/${encodeURIComponent(email)}`, key);
    if (!customer || !customer.id) return reply(res, 200, { orders: [] });
    const list = await paystack(`/transaction?customer=${encodeURIComponent(customer.id)}&status=success&perPage=50`, key);

    const orders = (Array.isArray(list) ? list : [])
      .map(t => ({ t, m: meta(t.metadata) }))
      .filter(({ t, m }) => t.status === "success" && t.currency === "NGN" && /^D09-/.test(String(m.order_reference || "")) && String(m.customer_email || t.customer && t.customer.email || "").toLowerCase() === email)
      .map(({ t, m }) => ({
        reference: m.order_reference,
        paid_at: t.paid_at || t.created_at || null,
        items: String(m.order_items || "").split("\n").map(s => s.trim()).filter(Boolean).slice(0, 20),
        delivery_state: String(m.delivery_state || ""),
        total_ngn: Math.round(Number(t.amount) / 100)
      }))
      .sort((a, b) => String(b.paid_at).localeCompare(String(a.paid_at)));
    res.setHeader("Cache-Control", "no-store");
    return reply(res, 200, { orders });
  } catch {
    return reply(res, 502, { error: "We couldn't load your orders right now. Please try again." });
  }
};
