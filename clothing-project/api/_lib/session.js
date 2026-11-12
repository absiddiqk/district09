const crypto = require("node:crypto");

const COOKIE = "d09_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret() {
  const s = process.env.SESSION_SECRET || "";
  return s.length >= 32 ? s : "";
}

function b64(buf) { return Buffer.from(buf).toString("base64url"); }
function sign(payload) { return crypto.createHmac("sha256", secret()).update(payload).digest("base64url"); }

function createToken(customerId) {
  const payload = b64(JSON.stringify({ id: String(customerId), exp: Math.floor(Date.now() / 1000) + MAX_AGE }));
  return payload + "." + sign(payload);
}

function readToken(token) {
  if (!secret() || typeof token !== "string") return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data || !/^\d+$/.test(String(data.id)) || data.exp < Date.now() / 1000) return null;
    return { id: String(data.id) };
  } catch { return null; }
}

function getSession(req) {
  const raw = (req.headers && (req.headers.cookie || req.headers.Cookie)) || "";
  const match = raw.split(/;\s*/).find(c => c.startsWith(COOKIE + "="));
  return match ? readToken(decodeURIComponent(match.slice(COOKIE.length + 1))) : null;
}

function cookie(value, maxAge) {
  return `${COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}
function setSession(res, customerId) { res.setHeader("Set-Cookie", cookie(encodeURIComponent(createToken(customerId)), MAX_AGE)); }
function clearSession(res) { res.setHeader("Set-Cookie", cookie("", 0)); }

function hashCode(email, code) {
  return crypto.createHmac("sha256", secret()).update(email + ":" + code).digest("hex");
}
function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

module.exports = { secret, setSession, clearSession, getSession, hashCode, safeEqual };
