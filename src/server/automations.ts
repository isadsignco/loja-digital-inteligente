import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function isAutomationEnabled(db: SupabaseClient, key: string) {
  const { data } = await db.from("automations").select("enabled").eq("key", key).maybeSingle();
  return data?.enabled ?? false;
}

/** Registra a execução de uma automação (sucesso/falha) para o painel. */
export async function runAutomation<T>(
  db: SupabaseClient,
  key: string,
  ref: string | null,
  fn: () => Promise<T>,
): Promise<T | null> {
  const { data: run } = await db.from("automation_runs").insert({ automation_key: key, ref }).select("id").single();
  try {
    const result = await fn();
    if (run) await db.from("automation_runs").update({ status: "sucesso", finished_at: new Date().toISOString() }).eq("id", run.id);
    return result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (run) await db.from("automation_runs").update({ status: "falhou", error: msg.slice(0, 1000), finished_at: new Date().toISOString() }).eq("id", run.id);
    await notifyAdmin(db, "falha_automacao", `Falha: ${key}`, msg, ref);
    return null;
  }
}

export async function notifyAdmin(db: SupabaseClient, kind: string, title: string, body?: string, ref?: string | null) {
  await db.from("admin_notifications").insert({ kind, title, body: body?.slice(0, 2000), ref: ref ?? null });
}
