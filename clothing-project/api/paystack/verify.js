const { recordPaidOrder } = require("../_lib/orders");

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
    return reply(res, 503, { error: "Paystack is not configured on the server." });
  }

  try {
    const reference = String(req.query && req.query.reference || "").trim();
    if (!reference || reference.length > 100 || !/^[A-Za-z0-9_-]+$/.test(reference)) {
      return reply(res, 400, { error: "A valid payment reference is required." });
    }

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(15000),
      }
    );

    let result = {};
    try {
      result = await response.json();
    } catch {
      // Handled below.
    }

    if (!response.ok || result.status !== true || !result.data) {
      console.error("Paystack verification failed; provider details omitted.");
      return reply(res, 502, {
        error: "We could not verify this transaction with Paystack.",
      });
    }

    const transaction = result.data;

    if (transaction.reference !== reference) {
      return reply(res, 502, {
        error: "Paystack returned a mismatched transaction reference.",
      });
    }

    if (transaction.status !== "success") {
      const status = ["failed", "abandoned", "reversed"].includes(transaction.status)
        ? "failed"
        : "pending";

      return reply(res, 200, { status, reference });
    }

    const metadata = parseMetadata(transaction.metadata);
    const expectedAmount = Number(metadata.expected_amount_kobo);

    if (transaction.currency !== "NGN") {
      return reply(res, 200, {
        status: "mismatch",
        error: "The payment currency does not match this order.",
      });
    }

    if (
      !Number.isSafeInteger(expectedAmount) ||
      expectedAmount <= 0 ||
      Number(transaction.amount) !== expectedAmount ||
      metadata.order_reference !== reference
    ) {
      return reply(res, 200, {
        status: "mismatch",
        error: "The payment amount does not match the order. Please contact District 09.",
      });
    }

    await recordPaidOrder({ reference, email: metadata.customer_email || (transaction.customer && transaction.customer.email), phone: metadata.customer_phone, amountKobo: transaction.amount });

    // The attached storefront sends an order-intent email before redirecting to Paystack.
    // This verifier does not claim that a separate paid-order email was sent.
    return reply(res, 200, {
      status: "success",
      reference,
      amount: Number(transaction.amount),
      currency: transaction.currency,
      mode: transaction.domain === "test" ? "test" : "live",
      order_email_sent: false,
    });
  } catch (error) {
    console.error(
      "Paystack verification error:",
      error && error.name || "Unknown error"
    );
    return reply(res, 500, {
      error: "Payment verification failed. Please try again.",
    });
  }
};
