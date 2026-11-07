import { z } from "zod";

/** Converte "27,90" / "27.90" / "R$ 27,90" em centavos. Vazio → null. */
export function parsePriceToCents(raw: unknown): number | null {
  const s = String(raw ?? "").replace(/[R$\s]/g, "").trim();
  if (!s) return null;
  // aceita 1.234,56 (BR) e 1234.56
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return NaN;
  return Math.round(Number(normalized) * 100);
}

export function centsToInput(cents: number | null | undefined) {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** Uma linha por item. */
export function lines(raw: unknown) {
  return String(raw ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Itens separados por vírgula. */
export function commaList(raw: unknown) {
  return String(raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** "Cor principal #b793d6" (uma por linha) → opções de cor para o cliente. */
export function parseColorSlots(raw: unknown) {
  const slots: { chave: string; rotulo: string; padrao: string }[] = [];
  for (const line of lines(raw)) {
    const m = line.match(/^(.*?)[\s:|-]*(#[0-9a-f]{6})$/i);
    if (!m || !m[1].trim()) return null;
    const rotulo = m[1].trim();
    slots.push({ chave: slugify(rotulo).replace(/-/g, "_").slice(0, 30) || `cor_${slots.length + 1}`, rotulo, padrao: m[2].toLowerCase() });
  }
  return slots;
}

/** Extrai o id do design de um link do Canva (canva.com/design/<ID>/...). Links curtos ficam como estão. */
export function canvaDesignIdFromLink(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const m = s.match(/canva\.com\/design\/([A-Za-z0-9_-]+)/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{8,}$/.test(s)) return s;
  return s; // ex.: canva.link/xxxx — resolvido depois pelo agente
}

const optionalText = z
  .string()
  .transform((s) => s.trim())
  .transform((s) => (s === "" ? null : s));

const optionalUrl = optionalText.refine((v) => v === null || /^https:\/\/(www\.)?(canva\.com|canva\.link)\//.test(v), {
  message: "Use um link do Canva (https://www.canva.com/... ou https://canva.link/...).",
});

const optionalInt = z
  .string()
  .transform((s) => s.trim())
  .refine((s) => s === "" || /^\d+$/.test(s), { message: "Use apenas números inteiros." })
  .transform((s) => (s === "" ? null : Number(s)));

export const PRODUCT_TYPES = [
  ["pack_posts", "Pack de posts"],
  ["pack_stories", "Pack de stories"],
  ["stickers", "Stickers digitais"],
  ["kit_identidade", "Kit de identidade visual"],
  ["elementos", "Elementos gráficos"],
  ["frases", "Frases e conteúdo"],
  ["planner", "Planner digital"],
  ["papelaria", "Papelaria / convites"],
] as const;

export const productFormSchema = z
  .object({
    creative_name: z.string().trim().min(2, "Informe o nome criativo."),
    commercial_name: z.string().trim().min(2, "Informe o nome comercial."),
    slug: z.string().trim(),
    line: z.enum(["original", "ai_design", "personalizado"]),
    status: z.enum(["rascunho", "aguardando_aprovacao", "ativo", "inativo", "arquivado"]),
    category_id: optionalText,
    description: z.string().trim(),
    target_audience: optionalText,
    ideal_for: optionalText,
    benefits: z.string(),
    differentials: z.string(),
    price: z.string(),
    promo_price: z.string(),
    keywords: z.string(),
    product_type: z.string().trim().min(1),
    formats: z.string(),
    file_count: optionalInt,
    canva_template_url: optionalUrl,
    canva_master_link: optionalText,
    usage_instructions: optionalText,
    customizable: z.boolean(),
    color_slots: z.string(),
    featured: z.boolean(),
    is_new: z.boolean(),
    available: z.boolean(),
    access_days: optionalInt,
    commercial_valid_until: optionalText,
  })
  .transform((v, ctx) => {
    const price = parsePriceToCents(v.price);
    const promo = parsePriceToCents(v.promo_price);
    if (price === null || Number.isNaN(price)) {
      ctx.addIssue({ code: "custom", path: ["price"], message: "Preço inválido. Ex.: 27,90" });
      return z.NEVER;
    }
    if (Number.isNaN(promo)) {
      ctx.addIssue({ code: "custom", path: ["promo_price"], message: "Preço promocional inválido." });
      return z.NEVER;
    }
    if (promo !== null && promo >= price) {
      ctx.addIssue({ code: "custom", path: ["promo_price"], message: "O preço promocional deve ser menor que o preço." });
      return z.NEVER;
    }
    if (v.customizable && !v.canva_master_link) {
      ctx.addIssue({
        code: "custom",
        path: ["canva_master_link"],
        message: "Produto personalizável precisa do link do design original no Canva.",
      });
      return z.NEVER;
    }
    if (v.status === "ativo" && !v.canva_template_url) {
      ctx.addIssue({
        code: "custom",
        path: ["canva_template_url"],
        message: "Para publicar, informe o link de template que o cliente vai receber.",
      });
      return z.NEVER;
    }
    const slots = parseColorSlots(v.color_slots);
    if (slots === null) {
      ctx.addIssue({ code: "custom", path: ["color_slots"], message: "Use uma cor por linha, assim: Cor principal #b793d6" });
      return z.NEVER;
    }
    if (v.customizable && !slots.length) {
      ctx.addIssue({ code: "custom", path: ["color_slots"], message: "Informe pelo menos uma cor que o cliente pode trocar." });
      return z.NEVER;
    }
    const slug = slugify(v.slug || v.commercial_name);
    if (!slug) {
      ctx.addIssue({ code: "custom", path: ["slug"], message: "Endereço inválido." });
      return z.NEVER;
    }
    return {
      product: {
        slug,
        line: v.line,
        status: v.status,
        category_id: v.category_id,
        creative_name: v.creative_name,
        commercial_name: v.commercial_name,
        description: v.description,
        target_audience: v.target_audience,
        ideal_for: v.ideal_for,
        benefits: lines(v.benefits),
        differentials: lines(v.differentials),
        price_cents: price,
        promo_price_cents: promo,
        keywords: commaList(v.keywords),
        product_type: v.product_type,
        formats: commaList(v.formats),
        file_count: v.file_count,
        canva_template_url: v.canva_template_url,
        usage_instructions: v.usage_instructions,
        customizable: v.customizable,
        customization_options: v.customizable ? { cores: slots } : {},
        featured: v.featured,
        is_new: v.is_new,
        available: v.available,
        access_days: v.access_days,
        commercial_valid_until: v.commercial_valid_until ? new Date(v.commercial_valid_until).toISOString() : null,
      },
      canvaMasterDesignId: v.canva_master_link ? canvaDesignIdFromLink(v.canva_master_link) : null,
    };
  });

export type ProductFormValues = z.input<typeof productFormSchema>;

export function formDataToProductInput(form: FormData): ProductFormValues {
  const str = (k: string) => String(form.get(k) ?? "");
  const bool = (k: string) => form.get(k) === "on";
  return {
    creative_name: str("creative_name"),
    commercial_name: str("commercial_name"),
    slug: str("slug"),
    line: str("line") as ProductFormValues["line"],
    status: str("status") as ProductFormValues["status"],
    category_id: str("category_id"),
    description: str("description"),
    target_audience: str("target_audience"),
    ideal_for: str("ideal_for"),
    benefits: str("benefits"),
    differentials: str("differentials"),
    price: str("price"),
    promo_price: str("promo_price"),
    keywords: str("keywords"),
    product_type: str("product_type"),
    formats: str("formats"),
    file_count: str("file_count"),
    canva_template_url: str("canva_template_url"),
    canva_master_link: str("canva_master_link"),
    usage_instructions: str("usage_instructions"),
    customizable: bool("customizable"),
    color_slots: str("color_slots"),
    featured: bool("featured"),
    is_new: bool("is_new"),
    available: bool("available"),
    access_days: str("access_days"),
    commercial_valid_until: str("commercial_valid_until"),
  };
}
