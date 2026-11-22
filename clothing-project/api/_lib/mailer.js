// Sends the sign-in code with Resend. Until your own domain is verified in Resend,
// Resend only delivers to the email you signed up with; set MAIL_FROM after verifying a domain.

function mailConfigured() { return Boolean(process.env.RESEND_API_KEY); }

async function sendLoginCode(to, code) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("mail_not_configured");
  const from = process.env.MAIL_FROM || "District 09 <onboarding@resend.dev>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from, to: [to],
      subject: `Your District 09 sign-in code: ${code}`,
      text: `Your District 09 sign-in code is ${code}.\n\nIt works for 10 minutes. If you didn't ask for it, you can ignore this email.`,
      html: `<p>Your District 09 sign-in code is:</p><p style="font-size:28px;font-weight:800;letter-spacing:6px">${code}</p><p>It works for 10 minutes. If you didn't ask for it, you can ignore this email.</p>`
    })
  });
  if (!response.ok) throw new Error("mail_failed");
}

const esc = s => String(s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Sent once, when a customer saves their details for the first time (registration complete).
async function sendWelcome(to, name) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("mail_not_configured");
  const from = process.env.MAIL_FROM || "District 09 <onboarding@resend.dev>";
  const first = String(name || "").trim().split(/\s+/)[0] || "there";
  const shop = "https://district09.ng/shop.html";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from, to: [to],
      subject: "You're registered with District 09",
      text: `Hi ${first},\n\nYou're registered with District 09 and signed in. Your details are saved, so your name, phone and delivery address fill in automatically at checkout.\n\nKeep shopping: ${shop}\n\nQuestions? Reply to this email or message us on WhatsApp: 09139656964.\n\nDISTRICT 09 COLLECTION`,
      html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#171717"><h2 style="margin:0 0 12px">You&rsquo;re registered, ${esc(first)}.</h2><p>You&rsquo;re registered with District 09 and signed in. Your details are saved, so your name, phone and delivery address fill in automatically at checkout.</p><p style="margin:24px 0"><a href="${shop}" style="background:#171717;color:#fff;padding:14px 22px;text-decoration:none;font-weight:700;letter-spacing:1px">KEEP SHOPPING</a></p><p style="color:#5c5952;font-size:13px">Questions? Reply to this email or message us on WhatsApp: 09139656964.</p><p style="color:#5c5952;font-size:13px">DISTRICT 09 COLLECTION</p></div>`
    })
  });
  if (!response.ok) throw new Error("mail_failed");
}

module.exports = { sendLoginCode, sendWelcome, mailConfigured };
