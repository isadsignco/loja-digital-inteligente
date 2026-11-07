import { Suspense } from "react";
import { requireAdmin } from "@/server/auth";
import { salvarModelo } from "../config-actions";
import { PageTitle } from "../ui";

export default function MessagesAdmin({ searchParams }: PageProps<"/admin/mensagens">) {
  return (
    <>
      <PageTitle sub="Textos enviados automaticamente. Marcadores: {{nome}} {{pedido}} {{itens}} {{links}} {{link_pedido}} {{loja}}">Mensagens automáticas</PageTitle>
      <Suspense fallback={<p className="mt-6 text-bege">Carregando…</p>}><List searchParams={searchParams} /></Suspense>
    </>
  );
}

async function List({ searchParams }: { searchParams: PageProps<"/admin/mensagens">["searchParams"] }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("message_templates").select("key, channel, kind, subject, body, active").order("key");
  return (
    <div className="mt-6 grid gap-4">
      {data?.map((t) => (
        <form key={t.key} action={salvarModelo.bind(null, t.key)} className="painel grid gap-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">{t.key.replace(/_/g, " ")} <span className="text-sm font-normal text-bege">· {t.channel} · {t.kind}</span></p>
            {sp.ok === t.key && <span className="text-sm text-lima">Salvo</span>}
          </div>
          {t.channel === "email" && <input name="assunto" defaultValue={t.subject ?? ""} className="campo" aria-label="Assunto" />}
          <textarea name="texto" rows={8} defaultValue={t.body} className="campo font-mono text-sm" aria-label="Texto" />
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ativo" defaultChecked={t.active} className="h-4 w-4 accent-[#0071e3]" />Ativa</label>
            <button className="btn btn-pink py-2">Salvar</button>
          </div>
        </form>
      ))}
    </div>
  );
}
