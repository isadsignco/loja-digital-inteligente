import { describe, expect, it } from "vitest";
import { summarize, type ReportOrder } from "./reports";

const o = (x: Partial<ReportOrder>): ReportOrder => ({
  id: Math.random().toString(), status: "pago", total_cents: 1000, created_at: "2026-11-05T12:00:00Z", paid_at: "2026-11-05T12:05:00Z",
  customer_id: "c1", utm_source: null, items: [{ product_id: "p1", name: "Pack", unit_price_cents: 1000, customized: false }], ...x,
});

describe("relatórios", () => {
  it("soma só pedidos pagos no período e calcula ticket médio, conversão e origem", () => {
    const r = summarize(
      [
        o({}),
        o({ customer_id: "c2", total_cents: 3000, utm_source: "pinterest", items: [{ product_id: "p2", name: "Stories", unit_price_cents: 3000, customized: true }] }),
        o({ status: "pendente", paid_at: null }),
        o({ created_at: "2026-10-01T00:00:00Z", paid_at: "2026-10-01T00:00:00Z" }), // fora do período, mas conta para recorrência
      ],
      new Date("2026-11-01T00:00:00Z"),
      new Date("2026-12-01T00:00:00Z"),
    );
    expect(r.revenueCents).toBe(4000);
    expect(r.paidOrders).toBe(2);
    expect(r.avgTicketCents).toBe(2000);
    expect(r.conversionPct).toBe(67);
    expect(r.bySource[0]).toEqual({ source: "pinterest", orders: 1, revenue: 3000 });
    expect(r.recurringBuyers).toBe(1);
    expect(r.customizedSold).toBe(1);
  });

  it("sem pedidos não inventa números", () => {
    const r = summarize([], new Date(0), new Date());
    expect(r.revenueCents).toBe(0);
    expect(r.conversionPct).toBeNull();
  });
});
