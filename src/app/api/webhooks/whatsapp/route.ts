import { after, NextResponse, type NextRequest } from "next/server";
import { optionalEnv } from "@/lib/env";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { isAutomationEnabled } from "@/server/automations";
import { enqueueMessage, processOutbox } from "@/server/messaging/outbox";
import { parseOrderRequest, verifyMetaSignature } from "@/server/messaging/whatsapp-signature";
import { orderCode, orderVars } from "@/server/orders";

/** Verificação do webhook pela Meta (configuração inicial). */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  if (p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === optionalEnv("WHATSAPP_VERIFY_TOKEN")) {
    return new NextResponse(p.get("hub.challenge") ?? "", { status: 200 });
  }
  return new NextResponse("forbidden", { status: 403 });
}

type WaPayload = {
  entry?: { changes?: { value?: { messages?: { from: string; id: string; type: string; text?: { body: string } }[] } }[] }[];
};

/** Mensagem recebida: se o cliente pedir os links do pedido, responde com eles. */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const secret = optionalEnv("WHATSAPP_APP_SECRET");
  if (!secret || !(await verifyMetaSignature(secret, raw, req.headers.get("x-hub-signature-256")))) {
    return new NextResponse("assinatura inválida", { status: 401 });
  }
  const payload = JSON.parse(raw) as WaPayload;
  const messages = payload.entry?.flatMap((e) => e.changes?.flatMap((c) => c.value?.messages ?? []) ?? []) ?? [];

  after(async () => {
    const db = getAdminSupabase();
    if (!(await isAutomationEnabled(db, "whatsapp_resposta"))) return;
    for (const m of messages) {
      const req = m.type === "text" && m.text ? parseOrderRequest(m.text.body) : null;
      if (!req) continue;
      const { data: o } = await db
        .from("orders")
        .select("id, access_token, status, customer_id")
        .eq("number", req.number)
        .maybeSingle();
      if (!o || o.status !== "pago" || orderCode(o.access_token) !== req.code) continue;
      await db.from("customer_interactions").insert({ customer_id: o.customer_id, channel: "whatsapp", summary: `Cliente pediu os links pelo WhatsApp (${m.from})` });
      await enqueueMessage(db, {
        dedupeKey: `whatsapp:entrega:${o.id}:${m.id}`,
        channel: "whatsapp",
        templateKey: "whatsapp_entrega",
        customerId: o.customer_id,
        recipient: m.from,
        vars: await orderVars(db, o.id),
      });
    }
    await processOutbox(db);
  });
  return NextResponse.json({ ok: true });
}
