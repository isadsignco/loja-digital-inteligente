import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireAdmin } from "@/server/auth";
import { orderLink } from "@/server/orders";
import { Badge, dateTime, DELIVERY_STATUS, Money, ORDER_STATUS, toneFor } from "../../ui";
import { conferirPagamento, entregarPersonalizado, estornar, reenviarEmail, refazerEntrega } from "../actions";

export default function OrderAdmin({ params, searchParams }: PageProps<"/admin/pedidos/[id]">) {
  return (
    <>
      <Link href="/admin/pedidos" className="text-sm text-pink hover:underline">‹ Pedidos</Link>
      <Suspense fallback={<p className="mt-6 text-bege">Carregando…</p>}>
        <Detail params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Detail({ params, searchParams }: { params: PageProps<"/admin/pedidos/[id]">["params"]; searchParams: PageProps<"/admin/pedidos/[id]">["searchParams"] }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const { data: o } = await supabase
    .from("orders")
    .select("*, customers(id, name, email, phone), order_items(id, unit_price_cents, product_snapshot, customizations(choices), deliveries(id, status, canva_link, last_error, delivered_at)), payments(provider_payment_id, method, status, amount_cents, approved_at, created_at)")
    .eq("id", id)
    .maybeSingle();
  if (!o) notFound();
  const { data: msgs } = await supabase
    .from("outbox_messages")
    .select("id, channel, template_key, status, attempts, last_error, sent_at, created_at")
    .like("dedupe_key", `%${id}%`)
    .order("created_at");
  const c = o.customers as { id: string; name: string | null; email: string; phone: string | null };
  type Item = { id: string; unit_price_cents: number; product_snapshot: { commercial_name: string }; customizations: { choices: { cores?: Record<string, string> } } | null; deliveries: { id: string; status: string; canva_link: string | null; last_error: string | null } | { id: string; status: string; canva_link: string | null; last_error: string | null }[] | null };
  const items = o.order_items as Item[];
  const pays = (o.payments ?? []) as { provider_payment_id: string; method: string; status: string; amount_cents: number; approved_at: string | null; created_at: string }[];
  const approved = pays.find((p) => p.status === "approved");

  return (
    <>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="titulo text-[36px]">Pedido #{o.number}</h1>
        <Badge tone={toneFor(o.status)}>{ORDER_STATUS[o.status] ?? o.status}</Badge>
      </div>
      {sp.ok && <p className="mt-3 rounded-xl bg-[#e8f5ec] px-4 py-3 text-sm text-lima">Feito.</p>}
      <p className="mt-2 text-bege">{dateTime(o.created_at)} · <Money cents={o.total_cents} /> · {o.payment_method === "pix" ? "Pix" : "Cartão"}{o.utm_source ? ` · origem ${o.utm_source}/${o.utm_campaign ?? ""}` : ""}</p>

      <section className="painel mt-6 p-5">
        <h2 className="font-semibold">Cliente</h2>
        <p className="mt-1"><Link href={`/admin/clientes/${c.id}`} className="text-pink hover:underline">{c.name ?? "—"}</Link> · {c.email}{c.phone ? ` · ${c.phone}` : ""}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <a className="btn btn-contorno py-2" href={`mailto:${c.email}?subject=Pedido%20%23${o.number}`}>E-mail</a>
          {c.phone && <a className="btn btn-contorno py-2" target="_blank" rel="noopener" href={`https://wa.me/${c.phone}`}>WhatsApp</a>}
          <a className="btn btn-contorno py-2" target="_blank" rel="noopener" href={orderLink(o.id, o.access_token)}>Página do pedido</a>
        </div>
      </section>

      <section className="painel mt-4 p-5">
        <h2 className="font-semibold">Itens e entregas</h2>
        <ul className="mt-3 grid gap-4">
          {items.map((i) => {
            const d = Array.isArray(i.deliveries) ? i.deliveries[0] : i.deliveries;
            const cores = i.customizations?.choices?.cores;
            return (
              <li key={i.id} className="rounded-2xl bg-white p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium">{i.product_snapshot.commercial_name}</span>
                  <span className="text-sm"><Money cents={i.unit_price_cents} /></span>
                </div>
                {cores && (
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-bege">Cores: {Object.entries(cores).map(([k, v]) => (<span key={k} className="flex items-center gap-1"><span className="inline-block h-4 w-4 rounded-full border border-linha" style={{ background: v }} />{k} {v}</span>))}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  {d ? <Badge tone={toneFor(d.status)}>{DELIVERY_STATUS[d.status] ?? d.status}</Badge> : <Badge>Sem entrega</Badge>}
                  {d?.canva_link && <a href={d.canva_link} target="_blank" rel="noopener" className="text-pink hover:underline">link entregue</a>}
                  {d?.last_error && <span className="text-[#c4291c]">{d.last_error}</span>}
                </div>
                {d?.status === "aguardando_link_manual" && (
                  <form action={entregarPersonalizado.bind(null, o.id, d.id)} className="mt-3 flex flex-wrap gap-2">
                    <input type="hidden" name="voltar" value={`/admin/pedidos/${o.id}?ok=1`} />
                    <input name="link" required placeholder="Link de template da cópia personalizada" className="campo flex-1" />
                    <button className="btn btn-pink py-2">Entregar</button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          {o.status === "pago" && <form action={reenviarEmail.bind(null, o.id)}><button className="btn btn-contorno py-2">Reenviar e-mail com os links</button></form>}
          {o.status === "pago" && <form action={refazerEntrega.bind(null, o.id)}><button className="btn btn-contorno py-2">Refazer entregas com falha</button></form>}
        </div>
      </section>

      <section className="painel mt-4 p-5">
        <h2 className="font-semibold">Pagamentos</h2>
        {!pays.length && <p className="mt-2 text-sm text-bege">Nenhum pagamento registrado ainda.</p>}
        <ul className="mt-2 grid gap-1 text-sm">
          {pays.map((p) => (
            <li key={p.provider_payment_id}>MP {p.provider_payment_id} · {p.method} · <Money cents={p.amount_cents} /> · <Badge tone={toneFor(p.status === "approved" ? "pago" : p.status)}>{p.status}</Badge> · {dateTime(p.approved_at ?? p.created_at)}</li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <form action={conferirPagamento.bind(null, o.id)}><button className="btn btn-contorno py-2">Conferir no Mercado Pago</button></form>
          {approved && o.status === "pago" && (
            <form action={estornar.bind(null, o.id, approved.provider_payment_id)}><button className="btn btn-contorno py-2 !border-[#c4291c] !text-[#c4291c]">Estornar pagamento</button></form>
          )}
        </div>
      </section>

      <section className="painel mt-4 p-5">
        <h2 className="font-semibold">Mensagens</h2>
        {!msgs?.length && <p className="mt-2 text-sm text-bege">Nenhuma mensagem.</p>}
        <ul className="mt-2 grid gap-1 text-sm">
          {msgs?.map((m) => (
            <li key={m.id}>{m.channel} · {m.template_key} · <Badge tone={toneFor(m.status)}>{m.status}</Badge> {m.attempts > 1 ? `· ${m.attempts} tentativas` : ""} {m.last_error ? <span className="text-[#c4291c]">· {m.last_error}</span> : null} · {dateTime(m.sent_at ?? m.created_at)}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
