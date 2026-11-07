import { Suspense } from "react";
import { requireAdmin } from "@/server/auth";
import { dateTime, PageTitle } from "../ui";
import { ContentForm, ProductAiForm, ResearchForm } from "./forms";

export default function CreationCenter() {
  return (
    <>
      <PageTitle sub="O Claude prepara; você aprova. Nada é publicado sem a sua revisão.">Central de Criação</PageTitle>
      <section className="painel mt-6 p-5 sm:p-7"><h2 className="titulo mb-4 text-[24px]">Cadastrar produto com IA</h2><ProductAiForm /></section>
      <section className="painel mt-4 p-5 sm:p-7"><h2 className="titulo mb-4 text-[24px]">Gerador de frases e conteúdos</h2><ContentForm /></section>
      <section className="painel mt-4 p-5 sm:p-7"><h2 className="titulo mb-4 text-[24px]">Pesquisar oportunidades</h2><p className="mb-3 text-sm text-bege">Busca na web com fontes. Instagram e TikTok não têm API pública de tendências; o resultado indica de onde veio cada informação.</p><ResearchForm /></section>
      <Suspense fallback={null}><Jobs /></Suspense>
    </>
  );
}

async function Jobs() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("ai_jobs").select("id, kind, status, cost_usd, error, created_at").order("created_at", { ascending: false }).limit(15);
  const month = await supabase.from("ai_jobs").select("cost_usd").gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());
  const total = (month.data ?? []).reduce((s, j) => s + Number(j.cost_usd ?? 0), 0);
  return (
    <section className="mt-8">
      <h2 className="titulo text-[24px]">Histórico da IA</h2>
      <p className="mt-1 text-sm text-bege">Custo estimado no mês: US$ {total.toFixed(2)} (calculado pelos tokens usados; o valor exato está no painel da Anthropic).</p>
      <ul className="mt-3 grid gap-1 text-sm">
        {data?.map((j) => <li key={j.id}>{dateTime(j.created_at)} · {j.kind} · {j.status}{j.cost_usd ? ` · US$ ${Number(j.cost_usd).toFixed(3)}` : ""}{j.error ? <span className="text-[#c4291c]"> · {j.error}</span> : null}</li>)}
        {!data?.length && <li className="text-bege">Nada ainda.</li>}
      </ul>
    </section>
  );
}
