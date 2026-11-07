/** Valida o header X-Hub-Signature-256 dos webhooks da Meta (HMAC-SHA256 do corpo com o App Secret). */
export async function verifyMetaSignature(appSecret: string, rawBody: string, header: string | null) {
  if (!header?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(appSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const given = header.slice(7);
  if (given.length !== hex.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

/** Encontra o código do pedido na mensagem do cliente: "pedido #123 código AB12CD". */
export function parseOrderRequest(text: string): { number: number; code: string } | null {
  const num = text.match(/#\s?(\d{1,10})/);
  const code = text.match(/c[oó]digo[:\s]+([a-z0-9]{6,12})/i);
  if (!num || !code) return null;
  return { number: Number(num[1]), code: code[1].toLowerCase() };
}
