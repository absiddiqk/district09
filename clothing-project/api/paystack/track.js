// Order tracking by payment reference.
// There is no order database: this reads the payment straight from Paystack and returns
// only non-personal details (items, delivery state and fee, totals). It never returns the
// customer's name, email, phone or street address.

function reply(res, status, payload) {
  return res.status(status).json(payload);
}

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

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return reply(res, 405, { error: "Method not allowed." });
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY || "";
  if (!secretKey.startsWith("sk_test_") && !secretKey.startsWith("sk_live_")) {
    return reply(res, 503, { error: "Order tracking is temporarily unavailable." });
  }

  const reference = String((req.query && req.query.reference) || "").trim();
  if (!/^D09-[A-Za-z0-9-]{8,80}$/.test(reference)) {
    return reply(res, 400, { error: "Please enter a valid order reference. It starts with D09-." });
  }

  try {
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${secretKey}`, Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      }
    );

    let result = {};
    try {
      result = await response.json();
    } catch {
      // Handled below.
    }

    if (response.status === 404) {
      return reply(res, 404, { error: "We could not find an order with that reference." });
    }
    if (!response.ok || result.status !== true || !result.data || result.data.reference !== reference) {
      console.error("Order tracking lookup failed; provider details omitted.");
      return reply(res, 502, { error: "We could not check this order right now. Please try again." });
    }

    const transaction = result.data;
    const metadata = parseMetadata(transaction.metadata);
    if (metadata.order_reference !== reference) {
      return reply(res, 404, { error: "We could not find an order with that reference." });
    }

    if (transaction.status !== "success") {
      const state = ["failed", "abandoned", "reversed"].includes(transaction.status) ? "failed" : "pending";
      return reply(res, 200, { status: state, reference });
    }

    const expected = Number(metadata.expected_amount_kobo);
    if (transaction.currency !== "NGN" || !Number.isSafeInteger(expected) || Number(transaction.amount) !== expected) {
      return reply(res, 200, { status: "mismatch", reference });
    }

    return reply(res, 200, {
      status: "paid",
      reference,
      paid_at: transaction.paid_at || null,
      items: String(metadata.order_items || "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 20),
      delivery_state: String(metadata.delivery_state || ""),
      product_total_ngn: Number(metadata.product_total_ngn) || null,
      delivery_fee_ngn: Number.isFinite(Number(metadata.delivery_fee_ngn)) ? Number(metadata.delivery_fee_ngn) : null,
      total_ngn: Math.round(Number(transaction.amount) / 100),
    });
  } catch (error) {
    console.error("Order tracking error:", (error && error.name) || "Unknown error");
    return reply(res, 500, { error: "We could not check this order right now. Please try again." });
  }
};
