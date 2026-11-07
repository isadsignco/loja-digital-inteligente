import { after, NextResponse, type NextRequest } from "next/server";
import { optionalEnv } from "@/lib/env";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { handlePaymentNotification } from "@/server/orders";
import { verifyMercadoPagoSignature } from "@/server/payments/mercadopago-signature";

/**
 * Webhook do Mercado Pago. Valida a assinatura, registra o evento (evento repetido
 * é ignorado) e processa em segundo plano consultando a API do MP.
 */
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const body = (await req.json().catch(() => ({}))) as { type?: string; action?: string; data?: { id?: string | number } };
  const dataId = url.searchParams.get("data.id") ?? (body.data?.id !== undefined ? String(body.data.id) : null);
  const type = url.searchParams.get("type") ?? body.type;
  const requestId = req.headers.get("x-request-id");

  const secret = optionalEnv("MERCADOPAGO_WEBHOOK_SECRET");
  const check = secret
    ? verifyMercadoPagoSignature({ secret, signatureHeader: req.headers.get("x-signature"), requestId, dataId, maxAgeSeconds: 60 * 60 * 24 })
    : { valid: false as const, reason: "header_ausente" as const };

  const db = getAdminSupabase();
  const eventKey = requestId ?? `${type}:${dataId}:${Date.now()}`;
  const { error } = await db.from("webhook_events").insert({
    provider: "mercadopago",
    event_key: eventKey,
    signature_valid: check.valid,
    payload: { query: Object.fromEntries(url.searchParams), body },
  });
  if (error?.code === "23505") return NextResponse.json({ ok: true, duplicado: true });
  if (!check.valid) return NextResponse.json({ ok: false }, { status: 401 });
  if (type !== "payment" || !dataId) return NextResponse.json({ ok: true, ignorado: true });

  after(async () => {
    try {
      await handlePaymentNotification(db, dataId);
      await db.from("webhook_events").update({ processed_at: new Date().toISOString() }).eq("provider", "mercadopago").eq("event_key", eventKey);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await db.from("webhook_events").update({ error: msg.slice(0, 1000) }).eq("provider", "mercadopago").eq("event_key", eventKey);
    }
  });
  return NextResponse.json({ ok: true });
}
