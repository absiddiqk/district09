const { clearSession } = require("../_lib/session");
const { reply } = require("../_lib/http");
module.exports = async (req, res) => {
  if (req.method !== "POST") return reply(res, 405, { error: "Method not allowed." });
  clearSession(res);
  return reply(res, 200, { ok: true });
};
