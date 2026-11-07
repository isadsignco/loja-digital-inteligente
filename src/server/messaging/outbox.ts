import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isAutomationEnabled, notifyAdmin } from "@/server/automations";
import { sendEmail } from "./email";
import { renderTemplate } from "./render";
import { sendWhatsAppText } from "./whatsapp";

type Enqueue = {
  dedupeKey: string; // impede envio duplicado: mesma chave = mesma mensagem
  channel: "email" | "whatsapp";
  kind?: "transacional" | "promocional";
  templateKey: string;
  customerId: string | null;
  recipient: string;
  vars: Record<string, string | number | null>;
};

export async function enqueueMessage(db: SupabaseClient, m: Enqueue) {
  const { error } = await db.from("outbox_messages").insert({
    dedupe_key: m.dedupeKey,
    channel: m.channel,
    kind: m.kind ?? "transacional",
    template_key: m.templateKey,
    customer_id: m.customerId,
    recipient: m.recipient,
    payload: m.vars,
  });
  if (error && error.code !== "23505") throw new Error(`Falha ao enfileirar mensagem: ${error.message}`);
}

const MAX_ATTEMPTS = 5;

/** Envia mensagens pendentes. Falhas são tentadas de novo com espera crescente. */
export async function processOutbox(db: SupabaseClient, limit = 20) {
  const now = new Date().toISOString();
  const { data: pending } = await db
    .from("outbox_messages")
    .select("id, channel, kind, template_key, customer_id, recipient, payload, attempts")
    .eq("status", "pendente")
    .lte("send_after", now)
    .order("created_at")
    .limit(limit);
  if (!pending?.length) return { sent: 0, failed: 0 };

  const emailOn = await isAutomationEnabled(db, "email_transacional");
  const waOn = await isAutomationEnabled(db, "whatsapp_resposta");
  let sent = 0;
  let failed = 0;

  for (const m of pending) {
    if ((m.channel === "email" && !emailOn) || (m.channel === "whatsapp" && !waOn)) continue;

    // marca como "enviando" só se ainda estiver pendente (evita dois processos enviarem a mesma)
    const { data: claimed } = await db
      .from("outbox_messages")
      .update({ status: "enviando", attempts: m.attempts + 1 })
      .eq("id", m.id)
      .eq("status", "pendente")
      .select("id");
    if (!claimed?.length) continue;

    try {
      // promocional: só com consentimento ativo
      if (m.kind === "promocional" && m.customer_id) {
        const purpose = m.channel === "email" ? "email_marketing" : "whatsapp_marketing";
        const { data: c } = await db
          .from("consents")
          .select("granted")
          .eq("customer_id", m.customer_id)
          .eq("purpose", purpose)
          .order("created_at", { ascending: false })
          .limit(1);
        if (!c?.[0]?.granted) {
          await db.from("outbox_messages").update({ status: "cancelado", last_error: "sem consentimento" }).eq("id", m.id);
          continue;
        }
      }
      const { data: tpl } = await db.from("message_templates").select("subject, body, active").eq("key", m.template_key).single();
      if (!tpl?.active) throw new Error(`Modelo ${m.template_key} inativo ou inexistente`);
      const vars = m.payload as Record<string, string>;
      const text = renderTemplate(tpl.body, vars);
      const providerId =
        m.channel === "email"
          ? await sendEmail(m.recipient, renderTemplate(tpl.subject ?? "", vars), text)
          : await sendWhatsAppText(m.recipient, text);
      await db
        .from("outbox_messages")
        .update({ status: "enviado", provider_message_id: providerId, sent_at: new Date().toISOString(), last_error: null })
        .eq("id", m.id);
      sent++;
    } catch (e) {
      failed++;
      const msg = e instanceof Error ? e.message : String(e);
      const attempts = m.attempts + 1;
      const giveUp = attempts >= MAX_ATTEMPTS;
      const backoffMin = 2 ** attempts; // 2, 4, 8, 16 minutos
      await db
        .from("outbox_messages")
        .update({
          status: giveUp ? "falhou" : "pendente",
          last_error: msg.slice(0, 1000),
          send_after: new Date(Date.now() + backoffMin * 60_000).toISOString(),
        })
        .eq("id", m.id);
      if (giveUp) await notifyAdmin(db, "falha_mensagem", `Mensagem não enviada (${m.channel})`, msg, m.id);
    }
  }
  return { sent, failed };
}
