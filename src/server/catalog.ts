import { unstable_cache } from "next/cache";
import { getPublicSupabase, publicMediaUrl } from "@/lib/supabase-public";

export type ProductLine = "original" | "ai_design" | "personalizado";

export type ProductSummary = {
  id: string;
  slug: string;
  line: ProductLine;
  creativeName: string;
  commercialName: string;
  priceCents: number;
  promoPriceCents: number | null;
  productType: string;
  customizable: boolean;
  featured: boolean;
  isNew: boolean;
  coverUrl: string | null;
  coverAlt: string;
};

export type ProductDetail = ProductSummary & {
  description: string;
  targetAudience: string | null;
  idealFor: string | null;
  benefits: string[];
  differentials: string[];
  formats: string[];
  fileCount: number | null;
  accessDays: number | null;
  categoryId: string | null;
  media: { url: string; alt: string; kind: string }[];
};

export type Category = { id: string; slug: string; name: string; description: string | null };

/** Resultado que distingue "sem dados" de "banco ainda não conectado". */
export type Catalog<T> = { configured: false } | { configured: true; data: T };

const BASE_COLUMNS =
  "id, slug, line, creative_name, commercial_name, price_cents, promo_price_cents, product_type, customizable, featured, is_new";
const SUMMARY_COLUMNS = `${BASE_COLUMNS}, product_media(storage_path, alt, position)`;

type Row = {
  id: string;
  slug: string;
  line: ProductLine;
  creative_name: string;
  commercial_name: string;
  price_cents: number;
  promo_price_cents: number | null;
  product_type: string;
  customizable: boolean;
  featured: boolean;
  is_new: boolean;
  product_media?: { storage_path: string; alt: string; position: number }[];
};

function toSummary(row: Row): ProductSummary {
  const cover = [...(row.product_media ?? [])].sort((a, b) => a.position - b.position)[0];
  return {
    id: row.id,
    slug: row.slug,
    line: row.line,
    creativeName: row.creative_name,
    commercialName: row.commercial_name,
    priceCents: row.price_cents,
    promoPriceCents: row.promo_price_cents,
    productType: row.product_type,
    customizable: row.customizable,
    featured: row.featured,
    isNew: row.is_new,
    coverUrl: cover ? publicMediaUrl(cover.storage_path) : null,
    coverAlt: cover?.alt ?? row.commercial_name,
  };
}

async function loadCategories(): Promise<Catalog<Category[]>> {
  const db = getPublicSupabase();
  if (!db) return { configured: false };
  const { data, error } = await db
    .from("categories")
    .select("id, slug, name, description")
    .order("position");
  if (error) throw new Error(`Falha ao carregar categorias: ${error.message}`);
  return { configured: true, data: data ?? [] };
}

async function loadProducts(filter: {
  categorySlug?: string;
  query?: string;
  line?: ProductLine;
  customizable?: boolean;
} = {}): Promise<Catalog<ProductSummary[]>> {
  const db = getPublicSupabase();
  if (!db) return { configured: false };

  let q = db.from("products").select(SUMMARY_COLUMNS).eq("status", "ativo").eq("available", true);

  if (filter.categorySlug) {
    const { data: cat } = await db.from("categories").select("id").eq("slug", filter.categorySlug).maybeSingle();
    if (!cat) return { configured: true, data: [] };
    q = q.eq("category_id", cat.id);
  }
  if (filter.line) q = q.eq("line", filter.line);
  if (filter.customizable !== undefined) q = q.eq("customizable", filter.customizable);
  if (filter.query?.trim()) {
    q = q.textSearch("search_vector", filter.query.trim(), { config: "portuguese", type: "websearch" });
  }

  const { data, error } = await q.order("published_at", { ascending: false, nullsFirst: false }).limit(60);
  if (error) throw new Error(`Falha ao carregar produtos: ${error.message}`);
  return { configured: true, data: (data as Row[]).map(toSummary) };
}

async function loadProduct(slug: string): Promise<Catalog<ProductDetail | null>> {
  const db = getPublicSupabase();
  if (!db) return { configured: false };

  const { data, error } = await db
    .from("products")
    .select(
      `${BASE_COLUMNS}, description, target_audience, ideal_for, benefits, differentials, formats, file_count, access_days, category_id, product_media(storage_path, alt, position, kind)`,
    )
    .eq("slug", slug)
    .eq("status", "ativo")
    .maybeSingle();
  if (error) throw new Error(`Falha ao carregar produto: ${error.message}`);
  if (!data) return { configured: true, data: null };

  const row = data as Row & {
    description: string;
    target_audience: string | null;
    ideal_for: string | null;
    benefits: string[];
    differentials: string[];
    formats: string[];
    file_count: number | null;
    access_days: number | null;
    category_id: string | null;
    product_media: { storage_path: string; alt: string; position: number; kind: string }[];
  };

  return {
    configured: true,
    data: {
      ...toSummary(row),
      description: row.description,
      targetAudience: row.target_audience,
      idealFor: row.ideal_for,
      benefits: row.benefits,
      differentials: row.differentials,
      formats: row.formats,
      fileCount: row.file_count,
      accessDays: row.access_days,
      categoryId: row.category_id,
      media: [...row.product_media]
        .sort((a, b) => a.position - b.position)
        .map((m) => ({ url: publicMediaUrl(m.storage_path), alt: m.alt, kind: m.kind })),
    },
  };
}

/*
 * Cache do catálogo: 60 s ou até o painel salvar algo (tag "catalogo").
 * Usa unstable_cache porque o Cache Components do Next ainda não é estável
 * no runtime da Cloudflare (hospedagem).
 */
const CACHE = { tags: ["catalogo"], revalidate: 60 };
export const getCategories = unstable_cache(loadCategories, ["catalogo-categorias"], CACHE);
export const getProducts = unstable_cache(loadProducts, ["catalogo-produtos"], CACHE);
export const getProduct = unstable_cache(loadProduct, ["catalogo-produto"], CACHE);
