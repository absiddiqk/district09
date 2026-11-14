const crypto = require("node:crypto");

// Henley offer window (West Africa Time). Keep in step with OFFER_START / OFFER_END in store.js.
const OFFER_START = Date.parse("2026-11-14T00:00:00+01:00");
const OFFER_END = Date.parse("2027-01-02T00:00:00+01:00");
const offerActive = () => Date.now() >= OFFER_START && Date.now() < OFFER_END;

const CATALOG = {
  "classic-henley": {
    name: "D09 Classic Henley",
    price: 30000,
    offer_price: 25000, // during the offer window (OFFER_START to OFFER_END)
    sizes: ["S", "M", "L", "XL", "2XL"],
    colors: ["Black", "White", "Sky Blue", "Brown", "Dark Grey"],
  },
  "short-sleeve-henley": {
    name: "D09 Short Sleeve Henley",
    price: 30000,
    offer_price: 25000, // during the offer window (OFFER_START to OFFER_END)
    sizes: ["S", "M", "L", "XL", "2XL"],
    colors: ["Black", "White", "Sky Blue", "Brown", "Dark Grey"],
  },
  "d09-signature-henley": {
    name: "D09 Signature Henley — Long Sleeve",
    price: 25000,
    sizes: ["M", "L"],
    colors: ["Brown", "Navy Blue"],
  },
  "d09-signature-henley-short-sleeve": {
    name: "D09 Signature Henley — Short Sleeve",
    price: 25000,
    sizes: ["M", "L"],
    colors: ["Brown", "Navy Blue"],
  },
  // Trousers mirror the sizes and colours the storefront offers (store.js PRODUCTS).
  "plain-trouser": {
    name: "D09 Plain Trouser",
    price: 30000,
    sizes: ["30", "32", "34", "36"],
    colors: ["Black", "Grey", "Navy Blue", "White"],
  },
  "pinstripe-trouser": {
    name: "D09 Pinstripe Trouser",
    price: 30000,
    sizes: ["30", "32", "34", "36"],
    colors: ["Black", "Grey", "Navy Blue", "White"],
  },
};

// Delivery fee per destination, in naira. The server is the source of truth:
// the fee is added to the amount sent to Paystack, so it cannot be changed from the browser.
// Keep this list identical to DELIVERY_FEES in store.js (a test checks they match).
const DELIVERY_FEES = {
  "Abia": 4500,
  "Adamawa": 7000,
  "Akwa Ibom": 6000,
  "Anambra": 4000,
  "Bauchi": 5500,
  "Bayelsa": 6000,
  "Benue": 5000,
  "Borno": 8000,
  "Cross River": 6000,
  "Delta": 4500,
  "Ebonyi": 4500,
  "Edo": 3500,
  "Ekiti": 5000,
  "Enugu": 4000,
  "FCT Abuja": 3500,
  "Gombe": 6000,
  "Imo": 4500,
  "Jigawa": 6500,
  "Kaduna": 4500,
  "Kano": 6000,
  "Katsina": 6500,
  "Kebbi": 7000,
  "Kogi": 2000,
  "Kwara": 5000,
  "Lagos": 5500,
  "Nasarawa": 4000,
  "Niger": 4500,
  "Ogun": 5500,
  "Ondo": 4500,
  "Osun": 5000,
  "Oyo": 5000,
  "Plateau": 5500,
  "Rivers": 5500,
  "Sokoto": 7500,
  "Taraba": 7000,
  "Yobe": 7000,
  "Zamfara": 7000,
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
    return reply(res, 500, {
      error: "Set PUBLIC_SITE_URL to the production HTTPS domain.",
    });
  }

  // Safety guard against using a live key on a Vercel Preview deployment.
  // This origin check is an operational guard, not authentication.
  if (mode === "live" && req.headers.origin !== origin) {
    return reply(res, 409, {
      error: "Live payments are only enabled on the approved production store.",
    });
  }

  try {
    let body = req.body || {};
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        return reply(res, 400, { error: "Invalid order data." });
      }
    }

    const customer = body.customer || {};
    const name = String(customer.name || "").trim().slice(0, 100);
    const email = String(customer.email || "").trim().toLowerCase().slice(0, 254);
    const phone = String(customer.phone || "").trim().slice(0, 30);
    const city = String(customer.city || "").trim().slice(0, 100);
    const state = String(customer.state || "").trim();
    const address = String(customer.address || "").trim().slice(0, 500);
    const note = String(customer.note || "None").trim().slice(0, 500);
    const items = body.items;

    if (
      !name ||
      !validEmail(email) ||
      !phone ||
      !city ||
      !address ||
      !Object.prototype.hasOwnProperty.call(DELIVERY_FEES, state) ||
      !Array.isArray(items) ||
      items.length < 1 ||
      items.length > 10
    ) {
      return reply(res, 400, {
        error: "Please provide valid contact, delivery, and order details.",
      });
    }

    let totalNgn = 0;
    const verifiedItems = [];
    const onOffer = offerActive();

    for (const item of items) {
      const product = CATALOG[item && item.id];
      const quantity = Number(item && item.quantity);

      if (
        !product ||
        !product.sizes.includes(item.size) ||
        !product.colors.includes(item.color) ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 10
      ) {
        return reply(res, 400, {
          error: "One or more order items are invalid or unavailable.",
        });
      }

      const unitPrice = onOffer && product.offer_price ? product.offer_price : product.price;
      const lineTotal = unitPrice * quantity;
      totalNgn += lineTotal;

      verifiedItems.push({
        name: product.name,
        color: item.color,
        size: item.size,
        quantity,
        unit_price_ngn: unitPrice,
        line_total_ngn: lineTotal,
      });
    }

    const productTotalNgn = totalNgn;
    const deliveryFeeNgn = DELIVERY_FEES[state];
    totalNgn = productTotalNgn + deliveryFeeNgn;

    // Never charge a different amount than the customer was shown (for example if the offer just started or ended).
    const shownTotal = Number(body.expected_total_ngn);
    if (Number.isFinite(shownTotal) && shownTotal !== totalNgn && body.accept_price_change !== true) {
      return reply(res, 409, {
        code: "price_changed",
        error: "Prices have been updated.",
        product_total_ngn: productTotalNgn,
        delivery_fee_ngn: deliveryFeeNgn,
        total_ngn: totalNgn,
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

    const orderLines = verifiedItems.map(
      (item) =>
        `${item.name} | Color: ${item.color} | Size: ${item.size} | Qty: ${item.quantity} | ₦${item.line_total_ngn.toLocaleString("en-NG")}`
    );

    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
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
            product_total_ngn: productTotalNgn,
            pricing: onOffer ? "offer" : "regular",
            delivery_fee_ngn: deliveryFeeNgn,
            delivery_state: state,
            order_items: orderLines.join("\n"),
            customer_name: name,
            customer_email: email,
            customer_phone: phone,
            delivery_city_state: `${city}, ${state}`,
            delivery_address: address,
            customer_notes: note,
            cancel_action: cancelAction.toString(),
            custom_fields: [
              {
                display_name: "Order reference",
                variable_name: "order_reference",
                value: reference,
              },
              {
                display_name: "Customer name",
                variable_name: "customer_name",
                value: name,
              },
              {
                display_name: "Order items",
                variable_name: "order_items",
                value: orderLines.join("; ").slice(0, 1800),
              },
              {
                display_name: "Delivery",
                variable_name: "delivery",
                value: `${state} — ₦${deliveryFeeNgn.toLocaleString("en-NG")}`,
              },
            ],
          },
        }),
        signal: AbortSignal.timeout(15000),
      }
    );

    let result = {};
    try {
      result = await response.json();
    } catch {
      // Handled as a generic provider failure below.
    }

    const data = result && result.data;
    if (
      !response.ok ||
      result.status !== true ||
      !data ||
      data.reference !== reference ||
      typeof data.authorization_url !== "string" ||
      !data.authorization_url.startsWith("https://checkout.paystack.com/" )
    ) {
      console.error("Paystack initialization failed; provider details omitted.");
      return reply(res, 502, {
        error: "Paystack could not start checkout. Please try again.",
      });
    }

    return reply(res, 200, {
      authorization_url: data.authorization_url,
      reference,
      mode,
      product_total_ngn: productTotalNgn,
      delivery_fee_ngn: deliveryFeeNgn,
      total_ngn: totalNgn,
    });
  } catch (error) {
    console.error(
      "Checkout initialization error:",
      (error && error.name) || "Unknown error"
    );
    return reply(res, 500, {
      error: "Something went wrong while starting payment. Please try again.",
    });
  }
};
