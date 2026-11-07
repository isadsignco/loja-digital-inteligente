import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReportOrder } from "./reports";

export async function loadReportOrders(db: SupabaseClient, since: Date): Promise<ReportOrder[]> {
  const { data, error } = await db
    .from("orders")
    .select("id, status, total_cents, created_at, paid_at, customer_id, utm_source, order_items(product_id, unit_price_cents, customization_id, product_snapshot)")
    .gte("created_at", since.toISOString())
    .order("created_at")
    .limit(5000);
  if (error) throw new Error(error.message);
  return (data ?? []).map((o) => ({
    ...o,
    items: (o.order_items as { product_id: string; unit_price_cents: number; customization_id: string | null; product_snapshot: { commercial_name: string } }[]).map((i) => ({
      product_id: i.product_id,
      name: i.product_snapshot.commercial_name,
      unit_price_cents: i.unit_price_cents,
      customized: Boolean(i.customization_id),
    })),
  }));
}
