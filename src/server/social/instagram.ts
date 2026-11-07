import "server-only";
import { optionalEnv, requireEnv } from "@/lib/env";

/**
 * Publicação de imagem no Instagram (Graph API, conta Profissional).
 * Reels com música, enquetes e stickers interativos NÃO são possíveis via API:
 * esses conteúdos ficam como "requer ação manual" no painel.
 */
const API = "https://graph.facebook.com/v21.0";

export function instagramConfigured() {
  return Boolean(optionalEnv("INSTAGRAM_USER_ID") && optionalEnv("INSTAGRAM_ACCESS_TOKEN"));
}

export async function publishInstagramImage(imageUrl: string, caption: string) {
  const user = requireEnv("INSTAGRAM_USER_ID");
  const token = requireEnv("INSTAGRAM_ACCESS_TOKEN");
  const create = await fetch(`${API}/${user}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl, caption: caption.slice(0, 2200), access_token: token }),
  });
  const c = (await create.json()) as { id?: string; error?: { message: string } };
  if (!c.id) throw new Error(`Instagram: ${c.error?.message ?? create.status}`);
  const pub = await fetch(`${API}/${user}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: c.id, access_token: token }),
  });
  const p = (await pub.json()) as { id?: string; error?: { message: string } };
  if (!p.id) throw new Error(`Instagram: ${p.error?.message ?? pub.status}`);
  return p.id;
}
