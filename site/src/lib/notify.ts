export async function notifyAdmin(_subject: string, _body: string) {
  void _subject; void _body;
  // Never log or email free-form customer content; review it in the protected dashboard.
  if (!process.env.ADMIN_EMAIL || !process.env.RESEND_API_KEY) return;
  try {
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: process.env.FROM_EMAIL || "IBQ <onboarding@resend.dev>", to: [process.env.ADMIN_EMAIL], subject: "IBQ dashboard activity", text: "A project needs attention. Sign in to your IBQ admin dashboard to review it." }) });
    if (!response.ok) console.warn("IBQ notification delivery failed");
  } catch { console.warn("IBQ notification delivery unavailable"); }
}
