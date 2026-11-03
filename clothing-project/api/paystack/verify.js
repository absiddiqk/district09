module.exports = async (req, res) => {
    res.setHeader("Content-Type", "application/json");

    if (req.method !== "GET") {
        return res.status(405).json({
            error: "Method not allowed."
        });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
        return res.status(500).json({
            error: "Paystack is not configured on the server."
        });
    }

    try {
        const reference = String(req.query.reference || "").trim();

        if (!reference || reference.length > 100) {
            return res.status(400).json({
                error: "A valid payment reference is required."
            });
        }

        const response = await fetch(
            `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${secretKey}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const result = await response.json();

        if (!response.ok || !result.status || !result.data) {
            console.error(
                "Paystack verification error:",
                result.message || "Unknown error"
            );

            return res.status(502).json({
                error: "We could not verify this transaction with Paystack."
            });
        }

        const transaction = result.data;

        if (transaction.status !== "success") {
            return res.status(200).json({
                status: "failed"
            });
        }

        if (transaction.currency !== "NGN") {
            return res.status(200).json({
                status: "mismatch",
                error: "The payment currency does not match this order."
            });
        }

        const expectedAmount = Number(
            transaction.metadata?.expected_amount_kobo
        );

        if (
            !Number.isInteger(expectedAmount) ||
            expectedAmount <= 0 ||
            transaction.amount !== expectedAmount
        ) {
            return res.status(200).json({
                status: "mismatch",
                error: "The payment amount does not match the order. Please contact District 09."
            });
        }

        return res.status(200).json({
            status: "success",
            order_email_sent: false
        });

    } catch (error) {
        console.error("Paystack verification error:", error);

        return res.status(500).json({
            error: "Payment verification failed. Please try again."
        });
    }
};