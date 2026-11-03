module.exports = async (req, res) => {
    res.setHeader("Content-Type", "application/json");

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed." });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
        return res.status(500).json({
            error: "Paystack is not configured on the server."
        });
    }

    try {
        const { customer, items } = req.body || {};

        if (
            !customer ||
            !customer.name ||
            !customer.email ||
            !customer.phone ||
            !customer.city ||
            !customer.address ||
            !Array.isArray(items) ||
            items.length === 0
        ) {
            return res.status(400).json({
                error: "Please provide your complete customer and order details."
            });
        }

        const email = String(customer.email).trim();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                error: "Please provide a valid email address."
            });
        }

        const catalog = {
            "classic-henley": {
                name: "D09 Classic Henley",
                price: 25000
            },
            "short-sleeve-henley": {
                name: "D09 Short Sleeve Henley",
                price: 25000
            },
            "d09-signature-henley": {
                name: "D09 Signature Henley",
                price: 25000
            }
        };

        let total = 0;
        const orderItems = [];

        for (const item of items) {
            const product = catalog[item.id];
            const quantity = Number(item.quantity);

            if (
                !product ||
                !Number.isInteger(quantity) ||
                quantity < 1 ||
                quantity > 10 ||
                !["M", "L"].includes(item.size) ||
                typeof item.color !== "string" ||
                !item.color.trim()
            ) {
                return res.status(400).json({
                    error: "One or more order items are invalid or unavailable."
                });
            }

            total += product.price * quantity;

            orderItems.push({
                name: product.name,
                color: item.color,
                size: item.size,
                quantity,
                unit_price: product.price
            });
        }

        const amountInKobo = total * 100;

        const response = await fetch(
            "https://api.paystack.co/transaction/initialize",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${secretKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email,
                    amount: amountInKobo,
                    currency: "NGN",
                    callback_url: "https://district09.vercel.app/",
                    metadata: {
                        customer_name: String(customer.name).trim(),
                        customer_phone: String(customer.phone).trim(),
                        delivery_city: String(customer.city).trim(),
                        delivery_address: String(customer.address).trim(),
                        customer_note: String(customer.note || "None").trim(),
                        order_items: orderItems,
                        expected_amount_kobo: amountInKobo
                    }
                })
            }
        );

        const result = await response.json();

        if (
            !response.ok ||
            !result.status ||
            !result.data?.authorization_url ||
            !result.data?.reference
        ) {
            console.error(
                "Paystack initialization error:",
                result.message || "Unknown error"
            );

            return res.status(502).json({
                error: result.message || "Paystack could not initialize this payment."
            });
        }

        return res.status(200).json({
            authorization_url: result.data.authorization_url,
            reference: result.data.reference,
            mode: secretKey.startsWith("sk_test_") ? "test" : "live"
        });

    } catch (error) {
        console.error("Checkout initialization error:", error);

        return res.status(500).json({
            error: "Something went wrong while starting payment. Please try again."
        });
    }
};