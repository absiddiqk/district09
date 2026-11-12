// Owner-only CSV export of your email list. Send the ADMIN_TOKEN as the "key" in the address.
//   /api/admin/customers?key=YOUR_TOKEN          people who agreed to updates
//   /api/admin/customers?key=YOUR_TOKEN&all=1    every customer
const crypto = require("node:crypto");
const { query, ensureSchema, dbConfigured, truthy } = require("../_lib/db");

function same(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
const cell = v => {
  let s = String(v == null ? "" : v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;           // stop spreadsheet formula injection
  return '"' + s.replace(/"/g, '""') + '"';
};

module.exports = async (req, res) => {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed." });
  const token = process.env.ADMIN_TOKEN || "";
  const given = (req.headers.authorization || "").replace(/^Bearer\s+/i, "") || (req.query && req.query.key) || "";
  if (token.length < 16 || !same(given, token)) return res.status(401).json({ error: "Not allowed." });
  if (!dbConfigured()) return res.status(503).json({ error: "Database isn't connected." });
  try {
    await ensureSchema();
    const all = req.query && req.query.all === "1";
    const rows = await query(
      `SELECT email, name, phone, city, state, marketing_consent, email_verified, source, created_at
       FROM customers ${all ? "" : "WHERE marketing_consent = TRUE"} ORDER BY created_at DESC`);
    const head = "email,name,phone,city,state,agreed_to_updates,email_verified,source,joined";
    const lines = rows.map(r => [r.email, r.name, r.phone, r.city, r.state, truthy(r.marketing_consent) ? "yes" : "no", truthy(r.email_verified) ? "yes" : "no", r.source, r.created_at].map(cell).join(","));
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="district09-customers.csv"');
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send([head, ...lines].join("\n"));
  } catch { return res.status(502).json({ error: "Couldn't read customers." }); }
};
