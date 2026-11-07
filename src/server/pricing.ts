/** Cálculo de preços do pedido — sempre a partir do banco, nunca do navegador. */
export type PricedProduct = {
  id: string;
  commercial_name: string;
  price_cents: number;
  promo_price_cents: number | null;
  status: string;
  available: boolean;
  customizable: boolean;
};

export type CartLine = { productId: string; cores?: Record<string, string> };

export function unitPrice(p: PricedProduct) {
  return p.promo_price_cents !== null && p.promo_price_cents < p.price_cents ? p.promo_price_cents : p.price_cents;
}

export function priceOrder(lines: CartLine[], products: PricedProduct[]) {
  const byId = new Map(products.map((p) => [p.id, p]));
  const items: { product: PricedProduct; unitPriceCents: number; cores?: Record<string, string> }[] = [];
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const key = line.productId + JSON.stringify(line.cores ?? {});
    if (seen.has(key)) continue; // produto digital: 1 unidade por variação
    seen.add(key);
    const p = byId.get(line.productId);
    if (!p || p.status !== "ativo" || !p.available) {
      problems.push(p ? `${p.commercial_name} não está mais disponível.` : "Um produto do carrinho não existe mais.");
      continue;
    }
    items.push({ product: p, unitPriceCents: unitPrice(p), cores: p.customizable ? line.cores : undefined });
  }
  const subtotal = items.reduce((s, i) => s + i.unitPriceCents, 0);
  return { items, subtotalCents: subtotal, totalCents: subtotal, problems };
}
