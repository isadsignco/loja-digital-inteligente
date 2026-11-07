import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { formatPrice } from "@/lib/format";
import { getServerSupabase } from "@/lib/supabase-server";
import { sairConta } from "./actions";
import { AccessLinkForm } from "./email-forms";

export const metadata: Metadata = { title: "Minha conta", robots: { index: false } };

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-[692px] px-5 py-12">
      <Suspense fallback={<p className="text-bege">Carregando…</p>}>
        <Account />
      </Suspense>
    </div>
  );
}

const STATUS: Record<string, string> = { pendente: "Aguardando pagamento", pago: "Pago", cancelado: "Cancelado", expirado: "Expirado", reembolsado: "Reembolsado", reembolso_parcial: "Reembolso parcial" };

async function Account() {
  const supabase = await getServerSupabase();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) {
    return (
      <div className="mx-auto max-w-[400px] text-center">
        <h1 className="titulo text-[40px]">Minha conta</h1>
        <p className="mt-2 text-[17px] text-bege">Acesse suas compras com o e-mail usado no pedido. Sem senha: enviamos um link de acesso.</p>
        <AccessLinkForm />
      </div>
    );
  }
  const { data: orders } = await supabase
    .from("orders")
    .select("id, number, status, total_cents, created_at, access_token, order_items(id, product_snapshot, deliveries(status, canva_link))")
    .order("created_at", { ascending: false });

  type Item = { id: string; product_snapshot: { commercial_name: string }; deliveries: { status: string; canva_link: string | null } | { status: string; canva_link: string | null }[] | null };
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="titulo text-[40px]">Minhas compras</h1>
        <form action={sairConta}><button className="text-sm text-bege hover:text-grafite">Sair</button></form>
      </div>
      <p className="mt-2 text-bege">{u.user.email}</p>
      {!orders?.length && <p className="painel mt-8 p-8 text-center">Nenhuma compra com este e-mail ainda. <Link href="/catalogo" className="text-pink underline">Ver catálogo</Link></p>}
      <div className="mt-8 grid gap-4">
        {orders?.map((o) => (
          <div key={o.id} className="painel p-5">
            <div className="flex flex-wrap justify-between gap-2 text-sm">
              <span className="font-semibold">Pedido #{o.number}</span>
              <span className="text-bege">{new Date(o.created_at).toLocaleDateString("pt-BR")} · {formatPrice(o.total_cents)} · {STATUS[o.status] ?? o.status}</span>
            </div>
            <ul className="mt-3 grid gap-2">
              {(o.order_items as unknown as Item[]).map((i) => {
                const d = Array.isArray(i.deliveries) ? i.deliveries[0] : i.deliveries;
                return (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span>{i.product_snapshot.commercial_name}</span>
                    {d?.status === "entregue" && d.canva_link ? (
                      <a href={d.canva_link} target="_blank" rel="noopener" className="text-[15px] text-pink hover:underline">Abrir no Canva ›</a>
                    ) : (
                      <span className="text-sm text-bege">{d?.status === "aguardando_link_manual" ? "Em preparação" : o.status === "pendente" ? "Aguardando pagamento" : "—"}</span>
                    )}
                  </li>
                );
              })}
            </ul>
            {o.status === "pendente" && <Link href={`/pedido/${o.id}?t=${o.access_token}`} className="mt-3 inline-block text-sm text-pink hover:underline">Ver pagamento ›</Link>}
          </div>
        ))}
      </div>
    </>
  );
}
