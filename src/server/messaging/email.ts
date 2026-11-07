import "server-only";
import { requireEnv } from "@/lib/env";
import { textToEmailHtml } from "./render";

/** Envia e-mail pelo Resend (API REST). */
export async function sendEmail(to: string, subject: string, text: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${requireEnv("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: requireEnv("EMAIL_FROM"), to: [to], subject, text, html: textToEmailHtml(text) }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Resend ${res.status}: ${body.slice(0, 300)}`);
  return (JSON.parse(body) as { id: string }).id;
}
