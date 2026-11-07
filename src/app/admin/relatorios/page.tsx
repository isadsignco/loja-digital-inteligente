import Link from "next/link";
import { Suspense } from "react";
import { loadReportOrders } from "@/server/admin-data";
import { requireAdmin } from "@/server/auth";
import { summarize } from "@/server/reports";
import { Money, PageTitle } from "../ui";

const PERIODS = { "7": "7 dias", "30": "30 dias", "90": "90 dias", "365": "12 meses" } as const;

export default function ReportsAdmin({ searchParams }: PageProps<"/admin/relatorios">) {
  return (
    <>
      <PageTitle sub="Todos os números vêm dos pedidos reais. Onde não há dado, aparece “Sem dados” — nada é estimado sem aviso.">Relatórios</PageTitle>
      <Suspense fallback={<p className="mt-6 text-bege">Carregando…</p>}><Report searchParams={searchParams} /></Suspense>
    </>
  );
}

function Stat({ label, children, note }: { label: string; children: React.ReactNode; note?: string }) {
  return (
    <div className="painel p-5">
      <p className="text-sm text-bege">{label}</p>
      <p className="titulo mt-2 text-[32px]">{children}</p>
      {note && <p className="text-xs text-bege">{note}</p>}
    </div>
  );
}

async function Report({ searchParams }: { searchParams: PageProps<"/admin/relatorios">["searchParams"] }) {
  const sp = await searchParams;
  const days = (typeof sp.p === "string" && sp.p in PERIODS ? sp.p : "30") as keyof typeof PERIODS;
  const { supabase } = await requireAdmin();
  const to = new Date();
  const from = new Date(to.getTime() - Number(days) * 86400_000);
  const orders = await loadReportOrders(supabase, new Date(to.getTime() - 730 * 86400_000));
  const r = summarize(orders, from, to);

  const [{ count: deliveredCount }, { count: failedCount }, { data: content }, { data: clicks }] = await Promise.all([
    supabase.from("deliveries").select("id", { count: "exact", head: true }).gte("created_at", from.toISOString()),
    supabase.from("deliveries").select("id", { count: "exact", head: true }).eq("status", "falhou").gte("created_at", from.toISOString()),
    supabase.from("content_items").select("id, platform, status, post_metrics(metric, value, fetched_at)").eq("status", "publicado").gte("published_at", from.toISOString()),
    supabase.from("link_clicks").select("id, tracking_links(utm_source)").gte("clicked_at", from.toISOString()),
  ]);
  const clicksBySource = new Map<string, number>();
  for (const c of clicks ?? []) {
    const s = (c.tracking_links as unknown as { utm_source: string | null })?.utm_source ?? "outro";
    clicksBySource.set(s, (clicksBySource.get(s) ?? 0) + 1);
  }
  let impressions = 0;
  let hasMetrics = false;
  for (const c of content ?? []) {
    const ms = (c.post_metrics as { metric: string; value: number; fetched_at: string }[]).filter((m) => m.metric === "impression").sort((a, b) => b.fetched_at.localeCompare(a.fetched_at));
    if (ms[0]) { impressions += Number(ms[0].value); hasMetrics = true; }
  }
  const failRate = deliveredCount ? Math.round(((failedCount ?? 0) / deliveredCount) * 100) : null;

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        {Object.entries(PERIODS).map(([k, v]) => <Link key={k} href={`/admin/relatorios?p=${k}`} className={`pilula px-3 py-1.5 ${days === k ? "bg-grafite text-white" : "bg-creme-2"}`}>{v}</Link>)}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Faturamento"><Money cents={r.revenueCents} /></Stat>
        <Stat label="Pedidos pagos">{r.paidOrders}</Stat>
        <Stat label="Ticket médio">{r.paidOrders ? <Money cents={r.avgTicketCents} /> : "Sem dados"}</Stat>
        <Stat label="Pedidos que viraram pagamento" note="pedidos pagos ÷ pedidos criados">{r.conversionPct === null ? "Sem dados" : `${r.conversionPct}%`}</Stat>
        <Stat label="Clientes recorrentes" note={`de ${r.buyers} compradores no período`}>{r.recurringBuyers}</Stat>
        <Stat label="Personalizados vendidos">{r.customizedSold}</Stat>
        <Stat label="Falhas de entrega">{failRate === null ? "Sem dados" : `${failRate}%`}</Stat>
        <Stat label="Impressões no Pinterest" note="API do Pinterest, Pins publicados no período">{hasMetrics ? impressions.toLocaleString("pt-BR") : "Sem dados"}</Stat>
        <Stat label="Cliques nos links rastreáveis">{[...clicksBySource.values()].reduce((a, b) => a + b, 0)}</Stat>
      </div>

      <section className="painel mt-6 p-5">
        <h2 className="font-semibold">Produtos mais vendidos</h2>
        {!r.topProducts.length ? <p className="mt-2 text-sm text-bege">Sem vendas no período.</p> : (
          <ol className="mt-3 grid gap-1 text-[15px]">{r.topProducts.map((p) => <li key={p.name} className="flex justify-between gap-3"><span>{p.name}</span><span>{p.qty} · <Money cents={p.revenue} /></span></li>)}</ol>
        )}
      </section>
      <section className="painel mt-4 p-5">
        <h2 className="font-semibold">Vendas por origem</h2>
        <p className="text-xs text-bege">Origem registrada quando o cliente chega por um link rastreável (/r/...). Sem link, conta como “direto / desconhecido”.</p>
        {!r.bySource.length ? <p className="mt-2 text-sm text-bege">Sem vendas no período.</p> : (
          <ul className="mt-3 grid gap-1 text-[15px]">{r.bySource.map((s) => <li key={s.source} className="flex justify-between gap-3"><span>{s.source}</span><span>{s.orders} pedido{s.orders === 1 ? "" : "s"} · <Money cents={s.revenue} /> · {clicksBySource.get(s.source) ?? 0} cliques</span></li>)}</ul>
        )}
      </section>
    </>
  );
}
