/**
 * Dados da marca. O nome pode ser trocado sem mexer no código pela variável
 * NEXT_PUBLIC_STORE_NAME; sem ela, o site usa "isakit.co".
 */
export const store = {
  name: process.env.NEXT_PUBLIC_STORE_NAME ?? "isakit.co",
  tagline: "Conteúdo pronto pra sua marca postar hoje",
  description:
    "Packs de posts, Stories, stickers e frases para pequenos negócios. Personalize nas cores da sua marca, veja a prévia e receba no Canva assim que o pagamento for confirmado.",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "",
} as const;

/** Separa "isakit.co" em "isakit" + ".co" para o logotipo pintar o final em rosa. */
export function brandParts(name: string = store.name): [string, string] {
  const i = name.lastIndexOf(".");
  return i > 0 ? [name.slice(0, i), name.slice(i)] : [name, ""];
}
