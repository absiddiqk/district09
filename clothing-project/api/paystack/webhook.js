// Paystack webhook: emails the store owner when a payment is confirmed.
//
// The request body is NOT trusted. We only read the order reference from it, then ask
// Paystack directly (with the secret key) whether that payment really succeeded and for
// the right amount. A forged request can therefore never produce an alert for an order
// that was not actually paid.
//
// Setup (Vercel env vars): RESEND_API_KEY (required), ORDER_ALERT_TO (optional, defaults to
// the store email), ORDER_ALERT_FROM (optional, defaults to Resend's test sender).
// Paystack dashboard: Settings > API Keys & Webhooks > Live/Test Webhook URL =
//   https://<your-site>/api/paystack/webhook

const DEFAULT_TO = "bydistrict09@gmail.com";
const DEFAULT_FROM = "District 09 Orders <onboarding@resend.dev>";

function parseMetadata(value) {
  if (value && typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const naira = (n) => "₦" + Number(n || 0).toLocaleString("en-NG");

function buildEmail(reference, tx, meta) {
  const items = String(meta.order_items || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const total = Number(tx.amount) / 100;
  const subject = `New paid order ${reference} — ${naira(total)}`;
  const rows = [
    ["Reference", reference],
    ["Paid", tx.paid_at || ""],
    ["Total paid", naira(total)],
    ["Products", naira(meta.product_total_ngn)],
    ["Delivery", `${naira(meta.delivery_fee_ngn)} (${meta.delivery_state || ""})`],
    ["Customer", meta.customer_name],
    ["Phone", meta.customer_phone],
    ["Email", meta.customer_email],
    ["Deliver to", `${meta.delivery_address || ""}, ${meta.delivery_city_state || ""}`],
  ];
  const text = [`NEW PAID ORDER`, "", ...items.map((i) => "- " + i), "", ...rows.map(([k, v]) => `${k}: ${v || ""}`)].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px"><h2 style="margin:0 0 12px">New paid order</h2>
<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
<table cellpadding="4" style="border-collapse:collapse">${rows.map(([k, v]) => `<tr><td style="color:#666">${esc(k)}</td><td><b>${esc(v)}</b></td></tr>`).join("")}</table></div>`;
  return { subject, text, html };
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });

  const secretKey = process.env.PAYSTACK_SECRET_KEY || "";
  const resendKey = process.env.RESEND_API_KEY || "";
  if (!secretKey.startsWith("sk_test_") && !secretKey.startsWith("sk_live_")) {
    return res.status(503).json({ error: "Not configured." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const event = body && body.event;
  const reference = String((body && body.data && body.data.reference) || "");

  // Ignore everything except successful charges for our own orders (acknowledge so Paystack stops retrying).
  if (event !== "charge.success" || !/^D09-[A-Za-z0-9-]{8,80}$/.test(reference)) {
    return res.status(200).json({ ok: true, ignored: true });
  }

  try {
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secretKey}`, Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    let result = {};
    try { result = await verifyRes.json(); } catch { /* handled below */ }
    if (!verifyRes.ok || result.status !== true || !result.data || result.data.reference !== reference) {
      return res.status(502).json({ error: "Could not verify payment." }); // Paystack will retry
    }

    const tx = result.data;
    const meta = parseMetadata(tx.metadata);
    const expected = Number(meta.expected_amount_kobo);
    if (meta.order_reference !== reference || tx.status !== "success" || tx.currency !== "NGN" ||
        !Number.isSafeInteger(expected) || Number(tx.amount) !== expected) {
      console.error("Webhook: payment did not match an order; no alert sent.");
      return res.status(200).json({ ok: true, ignored: true });
    }

    if (!resendKey) {
      console.error("Webhook: RESEND_API_KEY is not set; order alert not sent.");
      return res.status(200).json({ ok: true, alert: "not_configured" });
    }

    const mail = buildEmail(reference, tx, meta);
    const mailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.ORDER_ALERT_FROM || DEFAULT_FROM,
        to: [process.env.ORDER_ALERT_TO || DEFAULT_TO],
        reply_to: meta.customer_email || undefined,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!mailRes.ok) {
      console.error("Webhook: Resend rejected the alert, status " + mailRes.status);
      return res.status(502).json({ error: "Alert email failed." }); // Paystack will retry
    }
    return res.status(200).json({ ok: true, alert: "sent" });
  } catch {
    console.error("Webhook: unexpected error.");
    return res.status(502).json({ error: "Temporary error." });
  }
};
