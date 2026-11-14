// Paid-order memory, used to give the first-order Henley price once per customer.
// A customer counts as returning if their email OR phone number has a paid order on record.
const { query, ensureSchema, dbConfigured } = require("./db");

// Nigerian numbers: 0803..., +234803..., 234803... all become the last 10 digits.
function phoneKey(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : "";
}

// Returns true only when we can see a paid order. Any problem (no database, outage) returns false,
// so a technical fault never overcharges a customer.
async function hasPaidBefore(email, phone) {
  if (!dbConfigured()) return false;
  try {
    await ensureSchema();
    const key = phoneKey(phone);
    const rows = await query(
      "SELECT 1 FROM orders WHERE email = $1 OR ($2 <> '' AND phone_key = $2) LIMIT 1",
      [String(email || "").trim().toLowerCase(), key]);
    return rows.length > 0;
  } catch {
    return false;
  }
}

// Called once Paystack has confirmed a payment. Safe to call repeatedly for the same reference.
async function recordPaidOrder({ reference, email, phone, amountKobo }) {
  if (!dbConfigured() || !reference || !email) return;
  try {
    await ensureSchema();
    await query(
      "INSERT INTO orders (reference, email, phone_key, total_kobo) VALUES ($1, $2, $3, $4) ON CONFLICT (reference) DO NOTHING",
      [reference, String(email).trim().toLowerCase(), phoneKey(phone), Number(amountKobo) || null]);
  } catch {
    console.error("Could not record paid order.");
  }
}

module.exports = { phoneKey, hasPaidBefore, recordPaidOrder };
