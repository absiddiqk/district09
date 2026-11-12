const { truthy } = require("./db");
function publicCustomer(c) {
  return {
    id: String(c.id),
    email: c.email,
    name: c.name || "",
    phone: c.phone || "",
    address: c.address || "",
    city: c.city || "",
    state: c.state || "",
    marketing_consent: truthy(c.marketing_consent)
  };
}
module.exports = { publicCustomer };
