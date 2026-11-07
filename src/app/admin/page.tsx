import Link from "next/link";
import { Suspense } from "react";
import { loadReportOrders } from "@/server/admin-data";
import { requireAdmin } from "@/server/auth";
import { summarize } from "@/server/reports";
import { marcarNotificacoesLidas } from "./config-actions";
import { dateTime, Money, PageTitle } from "./ui";

export default function AdminHome() {
  return (
    <>
      <PageTitle>Visão geral</PageTitle>
      <Suspense fallback={<p className="mt-6 text-bege">Carregando…</p>}><Overview /></Suspense>
    </>
  );
}

async function count(q: PromiseLike<{ count: number | null; error: unknown }>) {
  const { count, error } = await q;
  return error ? null : (count ?? 0);
}

function Card({ label, value, href }: { label: string; value: React.ReactNode; href?: string }) {
  const body = (<><p className="text-sm text-bege">{label}</p><p className="titulo mt-2 text-[32px]">{value}</p></>);
  return href ? <Link href={href} className="painel p-5 hover:bg-[#ececf0]">{body}</Link> : <div className="painel p-5">{body}</div>;
}

async function Overview() {
  const { supabase } = await requireAdmin();
  const now = new Date();
  const today = new Date(now.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }) + "T00:00:00-03:00");
  const month = new Date(`${today.toISOString().slice(0, 7)}-01T00:00:00-03:00`);
  const orders = await loadReportOrders(supabase, month);
  const d = summarize(orders, today, now);
  const m = summarize(orders, month, now);
  const head = { count: "exact" as const, head: true };
  const [aguardando, pendentesEntrega, falhas, novosClientes, falhasAuto, { data: notes }] = await Promise.all([
    count(supabase.from("products").select("id", head).eq("status", "aguardando_aprovacao")),
    count(supabase.from("deliveries").select("id", head).eq("status", "aguardando_link_manual")),
    count(supabase.from("deliveries").select("id", head).eq("status", "falhou")),
    count(supabase.from("customers").select("id", head).gte("created_at", month.toISOString())),
    count(supabase.from("automation_runs").select("id", head).eq("status", "falhou").gte("started_at", new Date(now.getTime() - 7 * 86400_000).toISOString())),
    supabase.from("admin_notifications").select("id, title, body, created_at, kind").is("read_at", null).order("created_at", { ascending: false }).limit(15),
  ]);

  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card label="Vendas hoje" value={<Money cents={d.revenueCents} />} href="/admin/pedidos" />
        <Card label="Vendas no mês" value={<Money cents={m.revenueCents} />} href="/admin/relatorios" />
        <Card label="Pedidos pagos no mês" value={m.paidOrders} href="/admin/pedidos?status=pago" />
        <Card label="Clientes novos no mês" value={novosClientes ?? "—"} href="/admin/clientes" />
        <Card label="Clientes recorrentes" value={m.recurringBuyers} />
        <Card label="Produtos aguardando aprovação" value={aguardando ?? "—"} href="/admin/produtos" />
        <Card label="Personalizações pendentes" value={pendentesEntrega ?? "—"} href="/admin/personalizacoes" />
        <Card label="Falhas (entregas · automações 7d)" value={`${falhas ?? "—"} · ${falhasAuto ?? "—"}`} href="/admin/automacoes" />
      </div>
      {m.topProducts.length > 0 && (
        <p className="mt-4 text-sm text-bege">Mais vendido no mês: <b className="text-grafite">{m.topProducts[0].name}</b></p>
      )}

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="titulo text-[24px]">Avisos</h2>
          {!!notes?.length && <form action={marcarNotificacoesLidas}><button className="text-sm text-pink hover:underline">Marcar todos como lidos</button></form>}
        </div>
        {!notes?.length && <p className="mt-3 text-bege">Nenhum aviso novo.</p>}
        <ul className="mt-3 grid gap-2">
          {notes?.map((n) => (
            <li key={n.id} className={`rounded-2xl px-4 py-3 text-sm ${/falha|recusado|divergente/.test(n.kind) ? "bg-[#fff1f0]" : "bg-creme-2"}`}>
              <b className="font-semibold">{n.title}</b>{n.body ? ` · ${n.body}` : ""} <span className="text-bege">· {dateTime(n.created_at)}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
