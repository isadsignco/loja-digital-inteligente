/** Cálculos dos relatórios a partir dos pedidos reais (funções puras, testadas). */
export type ReportOrder = {
  id: string;
  status: string;
  total_cents: number;
  created_at: string;
  paid_at: string | null;
  customer_id: string;
  utm_source: string | null;
  items: { product_id: string; name: string; unit_price_cents: number; customized: boolean }[];
};

export function summarize(orders: ReportOrder[], from: Date, to: Date) {
  const inRange = orders.filter((o) => {
    const t = new Date(o.paid_at ?? o.created_at).getTime();
    return t >= from.getTime() && t < to.getTime();
  });
  const paid = inRange.filter((o) => o.status === "pago");
  const revenue = paid.reduce((s, o) => s + o.total_cents, 0);

  const byProduct = new Map<string, { name: string; qty: number; revenue: number }>();
  let customizedSold = 0;
  for (const o of paid)
    for (const i of o.items) {
      const cur = byProduct.get(i.product_id) ?? { name: i.name, qty: 0, revenue: 0 };
      cur.qty++;
      cur.revenue += i.unit_price_cents;
      byProduct.set(i.product_id, cur);
      if (i.customized) customizedSold++;
    }

  const bySource = new Map<string, { orders: number; revenue: number }>();
  for (const o of paid) {
    const k = o.utm_source ?? "direto / desconhecido";
    const cur = bySource.get(k) ?? { orders: 0, revenue: 0 };
    cur.orders++;
    cur.revenue += o.total_cents;
    bySource.set(k, cur);
  }

  // recorrente: cliente com mais de uma compra paga em todo o histórico
  const paidCountAll = new Map<string, number>();
  for (const o of orders) if (o.status === "pago") paidCountAll.set(o.customer_id, (paidCountAll.get(o.customer_id) ?? 0) + 1);
  const buyers = new Set(paid.map((o) => o.customer_id));
  const recurring = [...buyers].filter((c) => (paidCountAll.get(c) ?? 0) > 1).length;

  return {
    orders: inRange.length,
    paidOrders: paid.length,
    revenueCents: revenue,
    avgTicketCents: paid.length ? Math.round(revenue / paid.length) : 0,
    conversionPct: inRange.length ? Math.round((paid.length / inRange.length) * 100) : null,
    topProducts: [...byProduct.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
    bySource: [...bySource.entries()].map(([source, v]) => ({ source, ...v })).sort((a, b) => b.revenue - a.revenue),
    buyers: buyers.size,
    recurringBuyers: recurring,
    customizedSold,
  };
}
