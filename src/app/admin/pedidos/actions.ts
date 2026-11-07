"use server";

import { redirect } from "next/navigation";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { requireAdmin } from "@/server/auth";
import { processOutbox } from "@/server/messaging/outbox";
import { fulfillOrder, handlePaymentNotification, sendDeliveryMessages } from "@/server/orders";
import { refundPayment, searchPaymentsByOrder } from "@/server/payments/mercadopago";

async function log(action: string, entityId: string, details?: object) {
  const { supabase, user } = await requireAdmin();
  await supabase.from("audit_logs").insert({ actor: user.id, action, entity: "orders", entity_id: entityId, details });
}

export async function reenviarEmail(orderId: string) {
  await requireAdmin();
  const db = getAdminSupabase();
  await sendDeliveryMessages(db, orderId, `manual-${Date.now()}`);
  await processOutbox(db);
  await log("pedido.reenvio", orderId);
  redirect(`/admin/pedidos/${orderId}?ok=reenviado`);
}

export async function conferirPagamento(orderId: string) {
  await requireAdmin();
  const db = getAdminSupabase();
  const { results } = await searchPaymentsByOrder(orderId);
  for (const p of results.slice(0, 5)) await handlePaymentNotification(db, String(p.id));
  await log("pedido.conferencia", orderId);
  redirect(`/admin/pedidos/${orderId}?ok=conferido`);
}

export async function refazerEntrega(orderId: string) {
  await requireAdmin();
  const db = getAdminSupabase();
  // remove entregas que falharam e roda o fluxo de novo
  const { data: items } = await db.from("order_items").select("id").eq("order_id", orderId);
  await db.from("deliveries").delete().in("order_item_id", (items ?? []).map((i) => i.id)).eq("status", "falhou");
  await fulfillOrder(db, orderId);
  await log("pedido.refazer_entrega", orderId);
  redirect(`/admin/pedidos/${orderId}?ok=entrega`);
}

export async function estornar(orderId: string, paymentId: string) {
  await requireAdmin();
  const db = getAdminSupabase();
  const r = await refundPayment(paymentId);
  const { data: pay } = await db.from("payments").select("id, amount_cents").eq("provider_payment_id", paymentId).single();
  if (pay) await db.from("refunds").insert({ payment_id: pay.id, provider_refund_id: String(r.id), amount_cents: Math.round(r.amount * 100), reason: "painel" });
  await handlePaymentNotification(db, paymentId);
  await log("pedido.estorno", orderId, { paymentId });
  redirect(`/admin/pedidos/${orderId}?ok=estornado`);
}

/** Entrega manual de um item personalizado: cola o link da cópia no Canva. */
export async function entregarPersonalizado(orderId: string, deliveryId: string, form: FormData) {
  await requireAdmin();
  const link = String(form.get("link") ?? "").trim();
  if (!/^https:\/\/(www\.)?(canva\.com|canva\.link)\//.test(link)) redirect(`/admin/personalizacoes?erro=link`);
  const db = getAdminSupabase();
  await db.from("deliveries").update({ status: "entregue", canva_link: link, delivered_at: new Date().toISOString() }).eq("id", deliveryId);
  await sendDeliveryMessages(db, orderId, `personalizado-${deliveryId}`);
  await processOutbox(db);
  await log("pedido.entrega_personalizada", orderId, { deliveryId });
  redirect(String(form.get("voltar") ?? `/admin/pedidos/${orderId}`));
}

export async function registrarAtendimento(customerId: string, form: FormData) {
  const { supabase, user } = await requireAdmin();
  const summary = String(form.get("resumo") ?? "").trim();
  const channel = String(form.get("canal") ?? "nota");
  if (summary) await supabase.from("customer_interactions").insert({ customer_id: customerId, channel, summary, created_by: user.id });
  redirect(String(form.get("voltar") ?? `/admin/clientes/${customerId}`));
}

export async function salvarObservacoes(customerId: string, form: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("customers").update({ internal_notes: String(form.get("notas") ?? "") }).eq("id", customerId);
  redirect(`/admin/clientes/${customerId}?ok=1`);
}
