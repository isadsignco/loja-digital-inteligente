import { Suspense } from "react";
import { requireAdmin } from "@/server/auth";
import { alternarAutomacao } from "../config-actions";
import { Badge, dateTime, PageTitle, toneFor } from "../ui";

export default function AutomationsAdmin() {
  return (
    <>
      <PageTitle sub="Pause ou reative cada automação. O histórico mostra o que rodou e o que falhou.">Automações</PageTitle>
      <Suspense fallback={<p className="mt-6 text-bege">Carregando…</p>}><List /></Suspense>
    </>
  );
}

async function List() {
  const { supabase } = await requireAdmin();
  const [{ data: autos }, { data: runs }] = await Promise.all([
    supabase.from("automations").select("key, description, enabled").order("key"),
    supabase.from("automation_runs").select("id, automation_key, ref, status, error, started_at").order("started_at", { ascending: false }).limit(40),
  ]);
  return (
    <>
      <ul className="mt-6 grid gap-3">
        {autos?.map((a) => (
          <li key={a.key} className="painel flex flex-wrap items-center justify-between gap-3 p-5">
            <div><p className="font-semibold">{a.description}</p><p className="text-xs text-bege">{a.key}</p></div>
            <form action={alternarAutomacao.bind(null, a.key, !a.enabled)}>
              <button className={`btn py-2 ${a.enabled ? "btn-contorno" : "btn-pink"}`}>{a.enabled ? "Pausar" : "Ativar"}</button>
            </form>
          </li>
        ))}
      </ul>
      <h2 className="titulo mt-10 text-[24px]">Últimas execuções</h2>
      {!runs?.length && <p className="mt-3 text-bege">Nenhuma execução registrada ainda.</p>}
      <ul className="mt-3 grid gap-1 text-sm">
        {runs?.map((r) => (
          <li key={r.id}>{dateTime(r.started_at)} · {r.automation_key} · <Badge tone={toneFor(r.status)}>{r.status}</Badge>{r.error ? <span className="text-[#c4291c]"> · {r.error}</span> : null}</li>
        ))}
      </ul>
    </>
  );
}
