"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth";

export async function alternarAutomacao(key: string, enabled: boolean) {
  const { supabase, user } = await requireAdmin();
  await supabase.from("automations").update({ enabled, updated_at: new Date().toISOString() }).eq("key", key);
  await supabase.from("audit_logs").insert({ actor: user.id, action: enabled ? "automacao.ligada" : "automacao.pausada", entity: "automations", entity_id: key });
  redirect("/admin/automacoes");
}

export async function marcarNotificacoesLidas() {
  const { supabase } = await requireAdmin();
  await supabase.from("admin_notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  redirect("/admin");
}

export async function salvarModelo(key: string, form: FormData) {
  const { supabase } = await requireAdmin();
  await supabase
    .from("message_templates")
    .update({
      subject: String(form.get("assunto") ?? "") || null,
      body: String(form.get("texto") ?? ""),
      active: form.get("ativo") === "on",
      updated_at: new Date().toISOString(),
    })
    .eq("key", key);
  redirect(`/admin/mensagens?ok=${key}`);
}

export async function salvarConfiguracao(form: FormData) {
  const { supabase } = await requireAdmin();
  const whats = String(form.get("whatsapp_numero") ?? "").replace(/\D/g, "");
  await supabase.from("store_settings").upsert({ key: "whatsapp_numero", value: whats, updated_at: new Date().toISOString() });
  updateTag("catalogo");
  redirect("/admin/configuracoes?ok=1");
}
