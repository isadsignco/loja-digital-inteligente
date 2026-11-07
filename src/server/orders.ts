import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { siteUrl } from "@/lib/env";
import { notifyAdmin, runAutomation } from "./automations";
import { enqueueMessage, processOutbox } from "./messaging/outbox";
import { createCardCheckout, createPixPayment, getPayment, type MpPayment } from "./payments/mercadopago";
import { isApproved, orderStatusFromPayment } from "./payments/status";
import { priceOrder, type CartLine, type PricedProduct } from "./pricing";

export const PIX_MINUTES = 30;

export function orderCode(accessToken: string) {
  return accessToken.replace(/-/g, "").slice(0, 8);
}

export function orderLink(orderId: string, accessToken: string) {
  return `${siteUrl()}/pedido/${orderId}?t=${accessToken}`;
}

export type CheckoutInput = {
  name: string;
  email: string;
  phone: string | null;
  method: "pix" | "cartao";
  lines: CartLine[];
  marketingEmail: boolean;
  marketingWhatsapp: boolean;
  userId: string | null;
  utm: Record<string, string | null>;
  trackingLinkId: string | null;
};

/** Cria o pedido com preços do banco e inicia o pagamento. */
export async function createOrder(db: SupabaseClient, input: CheckoutInput) {
  const ids = [...new Set(input.lines.map((l) => l.productId))];
  const { data: products, error: pErr } = await db
    .from("products")
    .select("id, commercial_name, price_cents, promo_price_cents, status, available, customizable, canva_template_url, slug")
    .in("id", ids);
  if (pErr) throw new Error(pErr.message);
  const priced = priceOrder(input.lines, (products ?? []) as PricedProduct[]);
  if (priced.problems.length) return { ok: false as const, error: priced.problems.join(" ") };
  if (!priced.items.length) return { ok: false as const, error: "Seu carrinho está vazio." };

  // cliente (por e-mail)
  const email = input.email.trim().toLowerCase();
  const { data: existing } = await db.from("customers").select("id, user_id").eq("email", email).maybeSingle();
  let customerId = existing?.id as string | undefined;
  if (!customerId) {
    const { data: c, error } = await db
      .from("customers")
      .insert({ email, name: input.name, phone: input.phone, user_id: input.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    customerId = c.id;
    await notifyAdmin(db, "novo_cliente", `Novo cliente: ${input.name}`, email, customerId);
  } else {
    await db
      .from("customers")
      .update({ name: input.name, ...(input.phone ? { phone: input.phone } : {}), ...(input.userId && !existing?.user_id ? { user_id: input.userId } : {}) })
      .eq("id", customerId);
  }

  // consentimentos (LGPD) — registrados sempre, inclusive a recusa
  await db.from("consents").insert([
    { customer_id: customerId, purpose: "email_marketing", granted: input.marketingEmail, source: "checkout" },
    { customer_id: customerId, purpose: "whatsapp_marketing", granted: input.marketingWhatsapp, source: "checkout" },
  ]);

  const { data: order, error: oErr } = await db
    .from("orders")
    .insert({
      customer_id: customerId,
      subtotal_cents: priced.subtotalCents,
      total_cents: priced.totalCents,
      payment_method: input.method,
      utm_source: input.utm.utm_source ?? null,
      utm_medium: input.utm.utm_medium ?? null,
      utm_campaign: input.utm.utm_campaign ?? null,
      utm_content: input.utm.utm_content ?? null,
      tracking_link_id: input.trackingLinkId,
    })
    .select("id, number, access_token")
    .single();
  if (oErr) throw new Error(oErr.message);

  for (const item of priced.items) {
    let customizationId: string | null = null;
    if (item.cores && Object.keys(item.cores).length) {
      const { data: cz } = await db
        .from("customizations")
        .insert({ product_id: item.product.id, customer_id: customerId, choices: { cores: item.cores }, locked: true })
        .select("id")
        .single();
      customizationId = cz?.id ?? null;
    }
    const full = products!.find((p) => p.id === item.product.id)!;
    const { error } = await db.from("order_items").insert({
      order_id: order.id,
      product_id: item.product.id,
      unit_price_cents: item.unitPriceCents,
      customization_id: customizationId,
      product_snapshot: {
        commercial_name: full.commercial_name,
        slug: full.slug,
        canva_template_url: full.canva_template_url,
        customizable: full.customizable,
        price_cents: item.unitPriceCents,
      },
    });
    if (error) throw new Error(error.message);
  }

  const firstName = input.name.split(" ")[0];
  if (input.method === "pix") {
    const expiresAt = new Date(Date.now() + PIX_MINUTES * 60_000);
    const pay = await createPixPayment({
      orderId: order.id, orderNumber: order.number, amountCents: priced.totalCents, email, firstName, expiresAt,
    });
    await savePayment(db, order.id, pay, "pix");
    await db
      .from("orders")
      .update({
        pix_qr_code: pay.point_of_interaction?.transaction_data?.qr_code ?? null,
        pix_qr_base64: pay.point_of_interaction?.transaction_data?.qr_code_base64 ?? null,
        pix_expires_at: expiresAt.toISOString(),
      })
      .eq("id", order.id);
  } else {
    const pref = await createCardCheckout({
      orderId: order.id,
      orderNumber: order.number,
      accessToken: order.access_token,
      email,
      items: priced.items.map((i) => ({ title: i.product.commercial_name, unitPriceCents: i.unitPriceCents })),
    });
    await db.from("orders").update({ checkout_url: pref.init_point }).eq("id", order.id);
  }

  await enqueueMessage(db, {
    dedupeKey: `email:pedido_recebido:${order.id}`,
    channel: "email",
    templateKey: "pedido_recebido",
    customerId: customerId!,
    recipient: email,
    vars: await orderVars(db, order.id),
  });
  await notifyAdmin(db, "nova_compra", `Novo pedido #${order.number}`, `${input.name} · ${email}`, order.id);

  return { ok: true as const, orderId: order.id as string, accessToken: order.access_token as string };
}

async function savePayment(db: SupabaseClient, orderId: string, p: MpPayment, fallback: "pix" | "cartao") {
  const method = p.payment_method_id === "pix" ? "pix" : p.payment_type_id ? "cartao" : fallback;
  const valid = ["pending", "in_process", "authorized", "approved", "rejected", "cancelled", "refunded", "charged_back"];
  await db.from("payments").upsert(
    {
      order_id: orderId,
      provider: "mercadopago",
      provider_payment_id: String(p.id),
      method,
      status: valid.includes(p.status) ? p.status : "pending",
      amount_cents: Math.round(p.transaction_amount * 100),
      raw: p,
      approved_at: p.date_approved ?? null,
    },
    { onConflict: "provider,provider_payment_id" },
  );
}

/**
 * Processa a notificação de pagamento. A fonte da verdade é a consulta à API do
 * Mercado Pago, nunca o corpo do webhook nem a página de retorno.
 */
export async function handlePaymentNotification(db: SupabaseClient, paymentId: string) {
  const p = await getPayment(paymentId);
  const orderId = p.external_reference;
  if (!orderId) return { ignored: "sem pedido" };

  const { data: order } = await db.from("orders").select("id, status, total_cents, number").eq("id", orderId).maybeSingle();
  if (!order) return { ignored: "pedido não encontrado" };

  await savePayment(db, order.id, p, "cartao");

  if (isApproved(p.status)) {
    const paidCents = Math.round(p.transaction_amount * 100);
    if (paidCents < order.total_cents) {
      await notifyAdmin(db, "pagamento_divergente", `Valor divergente no pedido #${order.number}`, `pago ${paidCents} / esperado ${order.total_cents}`, order.id);
      return { ignored: "valor divergente" };
    }
    // transição única: só um processo consegue mudar de pendente para pago
    const { data: changed } = await db
      .from("orders")
      .update({ status: "pago", paid_at: new Date().toISOString() })
      .eq("id", order.id)
      .eq("status", "pendente")
      .select("id");
    if (changed?.length) {
      await notifyAdmin(db, "pagamento_aprovado", `Pagamento aprovado · pedido #${order.number}`, undefined, order.id);
      await fulfillOrder(db, order.id);
    }
    return { status: "pago" };
  }

  if (p.status === "rejected") {
    await notifyAdmin(db, "pagamento_recusado", `Pagamento recusado · pedido #${order.number}`, p.status_detail, order.id);
  }
  const next = orderStatusFromPayment(p.status, order.status);
  if (next !== order.status) await db.from("orders").update({ status: next }).eq("id", order.id);
  return { status: next };
}

/** Cria as entregas e envia as mensagens. Seguro para rodar mais de uma vez. */
export async function fulfillOrder(db: SupabaseClient, orderId: string) {
  return runAutomation(db, "entrega_automatica", orderId, async () => {
    const { data: items } = await db.from("order_items").select("id, product_snapshot, customization_id").eq("order_id", orderId);
    let hasCustom = false;
    for (const it of items ?? []) {
      const snap = it.product_snapshot as { canva_template_url?: string; commercial_name: string };
      const custom = Boolean(it.customization_id);
      hasCustom ||= custom;
      const status = custom ? "aguardando_link_manual" : snap.canva_template_url ? "entregue" : "falhou";
      // unique(order_item_id): uma segunda execução não cria outra entrega
      const { error } = await db.from("deliveries").insert({
        order_item_id: it.id,
        status,
        canva_link: custom ? null : (snap.canva_template_url ?? null),
        delivered_at: status === "entregue" ? new Date().toISOString() : null,
        last_error: status === "falhou" ? "Produto sem link de template cadastrado" : null,
      });
      if (error && error.code !== "23505") throw new Error(error.message);
      if (status === "falhou") await notifyAdmin(db, "falha_entrega", `Produto sem link: ${snap.commercial_name}`, undefined, orderId);
    }
    if (hasCustom) await notifyAdmin(db, "personalizacao_pendente", "Pedido com personalização aguardando", undefined, orderId);
    await sendDeliveryMessages(db, orderId, "auto");
    await processOutbox(db);
  });
}

/** Enfileira os e-mails de entrega. `tag` diferente permite reenviar manualmente. */
export async function sendDeliveryMessages(db: SupabaseClient, orderId: string, tag: string) {
  const { data: order } = await db.from("orders").select("id, customer_id, customers(email)").eq("id", orderId).single();
  if (!order) return;
  const email = (order.customers as unknown as { email: string }).email;
  const vars = await orderVars(db, orderId);
  if (vars.links) {
    await enqueueMessage(db, {
      dedupeKey: `email:produto_disponivel:${orderId}:${tag}`,
      channel: "email",
      templateKey: "produto_disponivel",
      customerId: order.customer_id,
      recipient: email,
      vars,
    });
  }
  if (vars.pendentes) {
    await enqueueMessage(db, {
      dedupeKey: `email:personalizacao:${orderId}:${tag}`,
      channel: "email",
      templateKey: "personalizacao_em_andamento",
      customerId: order.customer_id,
      recipient: email,
      vars,
    });
  }
}

/** Variáveis usadas nos modelos de mensagem. */
export async function orderVars(db: SupabaseClient, orderId: string) {
  const { data: o } = await db
    .from("orders")
    .select("id, number, access_token, customers(name, email), order_items(id, product_snapshot, deliveries(status, canva_link))")
    .eq("id", orderId)
    .single();
  if (!o) throw new Error("Pedido não encontrado");
  const cust = o.customers as unknown as { name: string | null; email: string };
  type Item = { product_snapshot: { commercial_name: string }; deliveries: { status: string; canva_link: string | null }[] | { status: string; canva_link: string | null } | null };
  const items = (o.order_items ?? []) as unknown as Item[];
  const deliv = (i: Item) => (Array.isArray(i.deliveries) ? i.deliveries[0] : i.deliveries);
  const links = items
    .filter((i) => deliv(i)?.status === "entregue" && deliv(i)?.canva_link)
    .map((i) => `• ${i.product_snapshot.commercial_name}\n  ${deliv(i)!.canva_link}`)
    .join("\n\n");
  const pendentes = items.filter((i) => deliv(i)?.status === "aguardando_link_manual").length;
  return {
    nome: (cust.name ?? "").split(" ")[0] || "tudo bem",
    pedido: o.number,
    itens: items.map((i) => `• ${i.product_snapshot.commercial_name}`).join("\n"),
    links,
    pendentes: pendentes ? String(pendentes) : "",
    link_pedido: orderLink(o.id, o.access_token),
    loja: process.env.NEXT_PUBLIC_STORE_NAME ?? "",
    codigo: orderCode(o.access_token),
  };
}
