import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireAdmin } from "@/server/auth";
import { registrarAtendimento, salvarObservacoes } from "../../pedidos/actions";
import { Badge, dateTime, Money, ORDER_STATUS, toneFor } from "../../ui";

export default function CustomerAdmin({ params }: PageProps<"/admin/clientes/[id]">) {
  return (
    <>
      <Link href="/admin/clientes" className="text-sm text-pink hover:underline">‹ Clientes</Link>
      <Suspense fallback={<p className="mt-6 text-bege">Carregando…</p>}><Detail params={params} /></Suspense>
    </>
  );
}

async function Detail({ params }: { params: PageProps<"/admin/clientes/[id]">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const [{ data: c }, { data: orders }, { data: notes }, { data: consents }, { data: tickets }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).maybeSingle(),
    supabase.from("orders").select("id, number, status, total_cents, created_at, order_items(product_snapshot, customizations(choices), deliveries(status))").eq("customer_id", id).order("created_at", { ascending: false }),
    supabase.from("customer_interactions").select("id, channel, summary, created_at").eq("customer_id", id).order("created_at", { ascending: false }),
    supabase.from("consents").select("purpose, granted, created_at").eq("customer_id", id).order("created_at", { ascending: false }),
    supabase.from("support_tickets").select("id, subject, status, created_at").eq("customer_id", id).order("created_at", { ascending: false }),
  ]);
  if (!c) notFound();
  const latest = new Map<string, boolean>();
  for (const k of consents ?? []) if (!latest.has(k.purpose)) latest.set(k.purpose, k.granted);
  const paid = (orders ?? []).filter((o) => o.status === "pago");

  return (
    <>
      <h1 className="titulo mt-2 text-[36px]">{c.name ?? c.email}</h1>
      <p className="mt-1 text-bege">{c.email}{c.phone ? ` · ${c.phone}` : ""} · cliente desde {dateTime(c.created_at)}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a className="btn btn-pink py-2" href={`mailto:${c.email}`}>Enviar e-mail</a>
        {c.phone && <a className="btn btn-contorno py-2" target="_blank" rel="noopener" href={`https://wa.me/${c.phone}`}>Abrir WhatsApp</a>}
      </div>
      <p className="mt-4 text-sm text-bege">
        Marketing por e-mail: {latest.get("email_marketing") ? "autorizado" : "não autorizado"} · WhatsApp promocional: {latest.get("whatsapp_marketing") ? "autorizado" : "não autorizado"}
      </p>

      <section className="painel mt-6 p-5">
        <h2 className="font-semibold">Compras · {paid.length} paga{paid.length === 1 ? "" : "s"} · <Money cents={paid.reduce((s, o) => s + o.total_cents, 0)} /></h2>
        <ul className="mt-3 grid gap-2 text-sm">
          {(orders ?? []).map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-4 py-3">
              <Link href={`/admin/pedidos/${o.id}`} className="text-pink hover:underline">#{o.number}</Link>
              <span className="text-bege">{(o.order_items as { product_snapshot: { commercial_name: string } }[]).map((i) => i.product_snapshot.commercial_name).join(", ")}</span>
              <span><Money cents={o.total_cents} /> · <Badge tone={toneFor(o.status)}>{ORDER_STATUS[o.status]}</Badge></span>
            </li>
          ))}
          {!orders?.length && <li className="text-bege">Nenhum pedido.</li>}
        </ul>
      </section>

      <section className="painel mt-4 p-5">
        <h2 className="font-semibold">Observações internas</h2>
        <form action={salvarObservacoes.bind(null, c.id)} className="mt-3 grid gap-2">
          <textarea name="notas" rows={3} defaultValue={c.internal_notes ?? ""} className="campo" />
          <button className="btn btn-contorno w-fit py-2">Salvar observações</button>
        </form>
      </section>

      <section className="painel mt-4 p-5">
        <h2 className="font-semibold">Histórico de atendimento</h2>
        <form action={registrarAtendimento.bind(null, c.id)} className="mt-3 flex flex-wrap gap-2">
          <select name="canal" className="campo w-auto"><option value="whatsapp">WhatsApp</option><option value="email">E-mail</option><option value="nota">Nota</option></select>
          <input name="resumo" placeholder="O que foi conversado/resolvido" className="campo flex-1" required />
          <button className="btn btn-pink py-2">Registrar</button>
        </form>
        <ul className="mt-3 grid gap-1 text-sm">
          {notes?.map((n) => <li key={n.id}>{dateTime(n.created_at)} · {n.channel} · {n.summary}</li>)}
          {tickets?.map((t) => <li key={t.id}>{dateTime(t.created_at)} · suporte · {t.subject} ({t.status})</li>)}
          {!notes?.length && !tickets?.length && <li className="text-bege">Sem registros.</li>}
        </ul>
      </section>
    </>
  );
}
