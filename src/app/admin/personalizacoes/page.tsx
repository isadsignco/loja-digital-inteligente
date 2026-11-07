import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/server/auth";
import { entregarPersonalizado } from "../pedidos/actions";
import { dateTime, PageTitle } from "../ui";

export default function CustomizationQueue({ searchParams }: PageProps<"/admin/personalizacoes">) {
  return (
    <>
      <PageTitle sub="Pedidos pagos com cores escolhidas pelo cliente. Crie a cópia no Canva com as cores, gere o link de template e cole aqui: o cliente recebe na hora por e-mail.">Personalizações</PageTitle>
      <Suspense fallback={<p className="mt-6 text-bege">Carregando…</p>}><Queue searchParams={searchParams} /></Suspense>
    </>
  );
}

async function Queue({ searchParams }: { searchParams: PageProps<"/admin/personalizacoes">["searchParams"] }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("deliveries")
    .select("id, created_at, order_items(order_id, product_id, product_snapshot, customizations(choices), orders(number, customers(name, email)))")
    .eq("status", "aguardando_link_manual")
    .order("created_at");
  if (error) throw new Error(error.message);
  const productIds = [...new Set((data ?? []).map((d) => (d.order_items as unknown as { product_id: string }).product_id))];
  const { data: priv } = productIds.length
    ? await supabase.from("product_private").select("product_id, canva_master_design_id").in("product_id", productIds)
    : { data: [] };
  const master = new Map((priv ?? []).map((p) => [p.product_id, p.canva_master_design_id as string | null]));

  if (!data?.length) return <p className="painel mt-6 p-8 text-center text-bege">Nenhuma personalização aguardando.</p>;
  return (
    <>
      {sp.erro && <p className="mt-4 rounded-xl bg-[#fff1f0] px-4 py-3 text-sm text-[#c4291c]">Cole um link do Canva válido (https://www.canva.com/...).</p>}
      <ul className="mt-6 grid gap-4">
        {data.map((d) => {
          const it = d.order_items as unknown as { order_id: string; product_id: string; product_snapshot: { commercial_name: string }; customizations: { choices: { cores?: Record<string, string> } } | null; orders: { number: number; customers: { name: string | null; email: string } } };
          const m = master.get(it.product_id);
          const masterUrl = m ? (m.startsWith("http") ? m : `https://www.canva.com/design/${m}/edit`) : null;
          return (
            <li key={d.id} className="painel p-5">
              <div className="flex flex-wrap justify-between gap-2">
                <p className="font-semibold">{it.product_snapshot.commercial_name}</p>
                <Link href={`/admin/pedidos/${it.order_id}`} className="text-sm text-pink hover:underline">Pedido #{it.orders.number} · {it.orders.customers.name ?? it.orders.customers.email}</Link>
              </div>
              <p className="mt-1 text-sm text-bege">Pago em {dateTime(d.created_at)}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                {Object.entries(it.customizations?.choices?.cores ?? {}).map(([k, v]) => (
                  <span key={k} className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5"><span className="inline-block h-5 w-5 rounded-full border border-linha" style={{ background: v }} />{k}: <b className="font-mono">{v}</b></span>
                ))}
              </div>
              {masterUrl ? <a href={masterUrl} target="_blank" rel="noopener" className="mt-3 inline-block text-sm text-pink hover:underline">Abrir design original no Canva ›</a> : <p className="mt-3 text-sm text-[#c4291c]">Produto sem design original cadastrado.</p>}
              <form action={entregarPersonalizado.bind(null, it.order_id, d.id)} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="voltar" value="/admin/personalizacoes" />
                <input name="link" required placeholder="Link de template da cópia personalizada" className="campo flex-1" />
                <button className="btn btn-pink py-2">Entregar ao cliente</button>
              </form>
            </li>
          );
        })}
      </ul>
    </>
  );
}
