import "server-only";
import { getPublicSupabase } from "@/lib/supabase-public";
import { priceOrder, type PricedProduct } from "./pricing";
import { readCart } from "./cart";

/** Carrinho com preços atuais do banco (para exibir). */
export async function getCartView() {
  const lines = await readCart();
  const db = getPublicSupabase();
  if (!db || !lines.length) return { lines, items: [], totalCents: 0, problems: [] as string[] };
  const { data } = await db
    .from("products")
    .select("id, commercial_name, price_cents, promo_price_cents, status, available, customizable, slug")
    .in("id", [...new Set(lines.map((l) => l.productId))]);
  const priced = priceOrder(lines, (data ?? []) as PricedProduct[]);
  return { lines, items: priced.items, totalCents: priced.totalCents, problems: priced.problems };
}
