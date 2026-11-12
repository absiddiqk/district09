const reply = (res, status, payload) => res.status(status).json(payload);

function body(req) {
  const b = req.body;
  if (b && typeof b === "object") return b;
  if (typeof b === "string") { try { return JSON.parse(b) || {}; } catch { return {}; } }
  return {};
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function cleanEmail(v) {
  const e = String(v || "").trim().toLowerCase();
  return e.length <= 254 && EMAIL_RE.test(e) && !/^[=+\-@]/.test(e) ? e : "";
}
const clip = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, n);

module.exports = { reply, body, cleanEmail, clip };
