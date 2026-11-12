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

module.exports = { sendLoginCode, mailConfigured };
