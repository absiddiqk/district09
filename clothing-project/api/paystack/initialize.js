const crypto = require("node:crypto");

const CATALOG = {
  "classic-henley": {
    name: "D09 Classic Henley",
    price: 25000,
    sizes: ["M", "L"],
    colors: ["Black", "White", "Sky Blue", "Brown", "Grey"],
  },
  "short-sleeve-henley": {
    name: "D09 Short Sleeve Henley",
    price: 25000,
    sizes: ["M", "L"],
    colors: ["Black", "White", "Sky Blue", "Brown", "Grey"],
  },
  "d09-signature-henley": {
    name: "D09 Signature Henley",
    price: 25000,
    sizes: ["M", "L"],
    colors: ["Earth Brown"],
  },
};

function reply(res, status, payload) {
  return res.status(status).json(payload);
}

function getMode(secretKey) {
  if (secretKey.startsWith("sk_test_")) return "test";
  if (secretKey.startsWith("sk_live_")) return "live";
  return "unconfigured";
}

function siteOrigin() {
  const raw = process.env.PUBLIC_SITE_URL || "https://district09.vercel.app";
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return reply(res, 405, { error: "Method not allowed." });
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY || "";
  const mode = getMode(secretKey);
  if (mode === "unconfigured") {
    return reply(res, 503, { error: "Paystack is not configured on the server." });
  }

  const origin = siteOrigin();
  if (!origin) {
    return reply(res, 500, { error: "Set PUBLIC_SITE_URL to the production HTTPS domain." });
  }

  // Safety against accidentally enabling a live key on a Vercel Preview deployment.
  // This origin check is an operational guard, not authentication.
  if (mode === "live" && req.headers.origin !== origin) {
    return reply(res, 409, { error: "Live payments are only enabled on the approved production store." });
  }

  try {
    let body = req.body || {};
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch { return reply(res, 400, { error: "Invalid order data." }); }
    }
    const customer = body.customer || {};
    const name = String(customer.name || "").trim().slice(0, 100);
    const email = String(customer.email || "").trim().toLowerCase().slice(0, 254);
    const phone = String(customer.phone || "").trim().slice(0, 30);
    const city = String(customer.city || "").trim().slice(0, 100);
    const address = String(customer.address || "").trim().slice(0, 500);
    const note = String(customer.note || "None").trim().slice(0, 500);
    const items = body.items;

    if (!name || !validEmail(email) || !phone || !city || !address ||
        !Array.isArray(items) || items.length < 1 || items.length > 10) {
      return reply(res, 400, { error: "Please provide valid contact, delivery, and order details." });
    }

    let totalNgn = 0;
    const verifiedItems = [];
    for (const item of items) {
      const product = CATALOG[item && item.id];
      const quantity = Number(item && item.quantity);
      if (!product || !product.sizes.includes(item.size) || !product.colors.includes(item.color) ||
          !Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
        return reply(res, 400, { error: "One or more order items are invalid or unavailable." });
      }
      const lineTotal = product.price * quantity;
      totalNgn += lineTotal;
      verifiedItems.push({
        name: product.name,
        color: item.color,
        size: item.size,
        quantity,
        unit_price_ngn: product.price,
        line_total_ngn: lineTotal,
      });
    }

    const expectedAmountKobo = totalNgn * 100;
    if (!Number.isSafeInteger(expectedAmountKobo) || expectedAmountKobo <= 0) {
      return reply(res, 400, { error: "The order total is invalid." });
    }

    const reference = `D09-${crypto.randomUUID()}`;
    const callback = new URL("/", origin);
    callback.searchParams.set("payment", "return");
    const cancelAction = new URL("/", origin);
    cancelAction.searchParams.set("payment", "cancelled");
    cancelAction.searchParams.set("reference", reference);
    const orderLines = verifiedItems.map(item =>
      `${item.name} | Color: ${item.color} | Size: ${item.size} | Qty: ${item.quantity} | ₦${item.line_total_ngn.toLocaleString("en-NG")}`
    );

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email,
        amount: expectedAmountKobo,
        currency: "NGN",
        reference,
        callback_url: callback.toString(),
        metadata: {
          order_reference: reference,
          expected_amount_kobo: expectedAmountKobo,
          order_total_kobo: expectedAmountKobo,
          order_total_ngn: totalNgn,
          order_items: orderLines.join("\n"),
          customer_name: name,
          customer_email: email,
          customer_phone: phone,
          delivery_city_state: city,
          delivery_address: address,
          customer_notes: note,
          cancel_action: cancelAction.toString(),
          custom_fields: [
            { display_name: "Order reference", variable_name: "order_reference", value: reference },
            { display_name: "Customer name", variable_name: "customer_name", value: name },
            { display_name: "Order items", variable_name: "order_items", value: orderLines.join("; ").slice(0, 1800) },
          ],
        },
      }),
      signal: AbortSignal.timeout(15000),
    });

    let result = {};
    try { result = await response.json(); } catch { /* handled as a generic provider failure */ }
    const data = result && result.data;
    if (!response.ok || result.status !== true || !data ||
        data.reference !== reference || typeof data.authorization_url !== "string" ||
        !data.authorization_url.startsWith("https://checkout.paystack.com/")) {
      console.error("Paystack initialization failed; provider details omitted.");
      return reply(res, 502, { error: "Paystack could not start checkout. Please try again." });
    }

    return reply(res, 200, {
      authorization_url: data.authorization_url,
      reference,
      mode,
    });
  } catch (error) {
    console.error("Checkout initialization error:", error && error.name || "Unknown error");
    return reply(res, 500, { error: "Something went wrong while starting payment. Please try again." });
  }
};
