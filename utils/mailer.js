const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

async function sendMail(to, subject, html) {
  const response = await fetch(BREVO_URL, {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: "Maritime News", email: process.env.MAIL_USER },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Email could not be sent: ${error}`);
  }
}

module.exports = sendMail;