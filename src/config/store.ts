/**
 * Dados da marca. O nome definitivo ainda será escolhido pela proprietária;
 * enquanto isso, o site exibe o valor de NEXT_PUBLIC_STORE_NAME.
 */
export const store = {
  name: process.env.NEXT_PUBLIC_STORE_NAME ?? "Nome da marca",
  tagline: "Packs prontos e personalizáveis para quem vende pelas redes",
  description:
    "Packs de posts, stories, stickers e conteúdos para Instagram e Pinterest. Entrega automática pelo Canva, com opção de personalizar nas cores da sua marca.",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "",
} as const;
