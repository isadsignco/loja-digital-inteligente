import { NextResponse, type NextRequest } from "next/server";
import { optionalEnv } from "@/lib/env";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { isAutomationEnabled, runAutomation } from "@/server/automations";
import { processOutbox } from "@/server/messaging/outbox";
import { handlePaymentNotification } from "@/server/orders";
import { searchPaymentsByOrder } from "@/server/payments/mercadopago";
import { publishDueContent } from "@/server/social/scheduler";

/** Rotina chamada a cada 10 minutos pelo agendador da Cloudflare (custom-worker.ts). */
export async function GET(req: NextRequest) {
  const secret = optionalEnv("CRON_SECRET");
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const db = getAdminSupabase();
  const report: Record<string, unknown> = {};

  // 1. Conferência de pagamentos (cobre webhook perdido)
  if (await isAutomationEnabled(db, "conferencia_pagamentos")) {
    report.pagamentos = await runAutomation(db, "conferencia_pagamentos", null, async () => {
      const since = new Date(Date.now() - 48 * 3600_000).toISOString();
      const { data: pending } = await db.from("orders").select("id").eq("status", "pendente").gte("created_at", since).limit(30);
      let checked = 0;
      for (const o of pending ?? []) {
        const { results } = await searchPaymentsByOrder(o.id);
        for (const p of results.slice(0, 3)) await handlePaymentNotification(db, String(p.id));
        checked++;
      }
      // Pix vencido há mais de 1 dia sem pagamento → expirado
      await db
        .from("orders")
        .update({ status: "expirado" })
        .eq("status", "pendente")
        .eq("payment_method", "pix")
        .lt("pix_expires_at", new Date(Date.now() - 24 * 3600_000).toISOString());
      return { conferidos: checked };
    });
  }

  // 2. Mensagens pendentes ou com nova tentativa
  report.mensagens = await processOutbox(db, 50);

  // 3. Publicações agendadas
  if (await isAutomationEnabled(db, "publicar_pinterest")) {
    report.publicacoes = await runAutomation(db, "publicar_pinterest", null, () => publishDueContent(db));
  }

  return NextResponse.json({ ok: true, ...report });
}
