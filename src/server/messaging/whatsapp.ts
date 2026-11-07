import "server-only";
import { requireEnv } from "@/lib/env";

/**
 * Envia texto pelo WhatsApp Business Platform (Cloud API).
 * Mensagem de texto livre só é aceita dentro da janela de 24 h aberta pelo cliente
 * (é o nosso fluxo: o cliente manda "quero receber meu pedido" e a loja responde).
 */
export async function sendWhatsAppText(to: string, text: string) {
  const phoneId = requireEnv("WHATSAPP_PHONE_NUMBER_ID");
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${requireEnv("WHATSAPP_TOKEN")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text, preview_url: true } }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${body.slice(0, 300)}`);
  return (JSON.parse(body) as { messages?: { id: string }[] }).messages?.[0]?.id ?? null;
}
