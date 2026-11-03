module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const key = process.env.PAYSTACK_SECRET_KEY || "";
  const mode = key.startsWith("sk_test_")
    ? "test"
    : key.startsWith("sk_live_")
      ? "live"
      : "unconfigured";

  return res.status(200).json({
    configured: mode !== "unconfigured",
    mode,
  });
};
