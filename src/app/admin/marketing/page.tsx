import { Suspense } from "react";
import { requireAdmin } from "@/server/auth";
import { Badge, dateTime, PageTitle, toneFor } from "../ui";
import { aprovarEAgendar, cancelarConteudo, criarConteudoManual, gerarPinsParaProduto, marcarPublicadoManual, publicarAgora, salvarTexto } from "./actions";

const STATUS: Record<string, string> = { rascunho: "Rascunho", aprovado: "Aprovado", agendado: "Agendado", publicando: "Publicando", publicado: "Publicado", falhou: "Falhou", requer_acao_manual: "Ação manual", cancelado: "Cancelado" };

export default function MarketingAdmin({ searchParams }: PageProps<"/admin/marketing">) {
  return (
    <>
      <PageTitle sub="Conteúdo orgânico, sem anúncios pagos. Pinterest é publicado pela API oficial; quando uma rede não permite publicar sozinho, o item fica como “Ação manual” com o motivo.">Marketing</PageTitle>
      <Suspense fallback={<p className="mt-6 text-bege">Carregando…</p>}><Board searchParams={searchParams} /></Suspense>
    </>
  );
}

async function Board({ searchParams }: { searchParams: PageProps<"/admin/marketing">["searchParams"] }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const [{ data: products }, { data: items }, { data: clicks }] = await Promise.all([
    supabase.from("products").select("id, commercial_name").eq("status", "ativo").order("commercial_name"),
    supabase.from("content_items").select("id, platform, format, title, caption, media, status, scheduled_at, published_at, manual_action_reason, error, tracking_link_id, post_metrics(metric, value, fetched_at)").neq("status", "cancelado").order("created_at", { ascending: false }).limit(60),
    supabase.from("link_clicks").select("tracking_link_id"),
  ]);
  const clickCount = new Map<string, number>();
  for (const c of clicks ?? []) clickCount.set(c.tracking_link_id, (clickCount.get(c.tracking_link_id) ?? 0) + 1);

  return (
    <>
      {sp.erro && <p className="mt-4 rounded-xl bg-[#fff1f0] px-4 py-3 text-sm text-[#c4291c]">{sp.erro === "sem-imagem" ? "O produto precisa ter pelo menos uma imagem." : String(sp.erro)}</p>}
      {sp.ok && <p className="mt-4 rounded-xl bg-[#e8f5ec] px-4 py-3 text-sm text-lima">Feito.</p>}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <form action={gerarPinsParaProduto} className="painel grid gap-3 p-5">
          <p className="font-semibold">Gerar Pins com IA</p>
          <select name="produto" required className="campo">{products?.map((p) => <option key={p.id} value={p.id}>{p.commercial_name}</option>)}</select>
          <input name="quantidade" type="number" min={1} max={10} defaultValue={5} className="campo" aria-label="Quantidade" />
          <button className="btn btn-pink w-fit py-2" disabled={!products?.length}>Gerar rascunhos</button>
          {!products?.length && <p className="text-xs text-bege">Publique um produto primeiro.</p>}
        </form>
        <form action={criarConteudoManual} className="painel grid gap-3 p-5">
          <p className="font-semibold">Novo conteúdo</p>
          <div className="flex gap-2">
            <select name="plataforma" className="campo"><option value="instagram">Instagram</option><option value="pinterest">Pinterest</option><option value="tiktok">TikTok</option></select>
            <select name="formato" className="campo"><option value="post">Post</option><option value="carrossel">Carrossel</option><option value="reel">Reels</option><option value="story">Story</option><option value="pin">Pin</option><option value="roteiro_tiktok">Roteiro TikTok</option></select>
          </div>
          <select name="produto" className="campo"><option value="">Sem produto</option>{products?.map((p) => <option key={p.id} value={p.id}>{p.commercial_name}</option>)}</select>
          <input name="titulo" placeholder="Título (Pinterest)" className="campo" />
          <textarea name="legenda" rows={3} placeholder="Legenda / roteiro" className="campo" />
          <button className="btn btn-contorno w-fit py-2">Criar rascunho</button>
        </form>
      </div>

      <h2 className="titulo mt-10 text-[24px]">Calendário e conteúdos</h2>
      {!items?.length && <p className="mt-3 text-bege">Nenhum conteúdo ainda.</p>}
      <ul className="mt-4 grid gap-4">
        {items?.map((c) => {
          const media = c.media as { url: string }[];
          const metrics = (c.post_metrics as { metric: string; value: number; fetched_at: string }[]) ?? [];
          const latest = new Map<string, number>();
          for (const m of [...metrics].sort((a, b) => a.fetched_at.localeCompare(b.fetched_at))) latest.set(m.metric, m.value);
          return (
            <li key={c.id} className="painel grid gap-3 p-5 sm:grid-cols-[120px_1fr]">
              {media[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={media[0].url} alt="" className="aspect-[2/3] w-full rounded-xl object-cover" />
              ) : <div className="aspect-[2/3] rounded-xl bg-white" />}
              <div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <b className="capitalize">{c.platform}</b> · {c.format} · <Badge tone={toneFor(c.status)}>{STATUS[c.status] ?? c.status}</Badge>
                  {c.scheduled_at && c.status === "agendado" && <span className="text-bege">para {dateTime(c.scheduled_at)}</span>}
                  {c.published_at && <span className="text-bege">publicado {dateTime(c.published_at)}</span>}
                  {c.tracking_link_id && <span className="text-bege">· {clickCount.get(c.tracking_link_id) ?? 0} cliques no link</span>}
                </div>
                {c.manual_action_reason && c.status === "requer_acao_manual" && <p className="mt-1 text-sm text-[#a05a00]">{c.manual_action_reason}</p>}
                {c.error && <p className="mt-1 text-sm text-[#c4291c]">{c.error}</p>}
                {latest.size > 0 && <p className="mt-1 text-xs text-bege">Pinterest (30 dias): {[...latest].map(([k, v]) => `${k} ${v}`).join(" · ")}</p>}
                <form action={salvarTexto.bind(null, c.id)} className="mt-3 grid gap-2">
                  <input name="titulo" defaultValue={c.title ?? ""} className="campo" aria-label="Título" />
                  <textarea name="legenda" defaultValue={c.caption ?? ""} rows={3} className="campo" aria-label="Legenda" />
                  <button className="w-fit text-sm text-pink hover:underline">Salvar texto</button>
                </form>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  {["rascunho", "aprovado", "falhou"].includes(c.status) && (
                    <form action={aprovarEAgendar.bind(null, c.id)} className="flex flex-wrap items-center gap-2">
                      <input type="datetime-local" name="quando" className="campo w-auto py-1.5" aria-label="Data e hora (horário de Brasília)" />
                      <button className="btn btn-pink py-2">Aprovar e agendar</button>
                    </form>
                  )}
                  {["rascunho", "aprovado", "agendado", "falhou"].includes(c.status) && <form action={publicarAgora.bind(null, c.id)}><button className="btn btn-contorno py-2">Publicar agora</button></form>}
                  {c.status === "requer_acao_manual" && <form action={marcarPublicadoManual.bind(null, c.id)}><button className="btn btn-contorno py-2">Já publiquei manualmente</button></form>}
                  {c.status !== "publicado" && <form action={cancelarConteudo.bind(null, c.id)}><button className="py-2 text-bege hover:text-grafite">Cancelar</button></form>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
