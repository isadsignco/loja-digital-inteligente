import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/server/auth";
import { Badge, dateTime, Money, ORDER_STATUS, PageTitle, toneFor } from "../ui";

export default function OrdersAdmin({ searchParams }: PageProps<"/admin/pedidos">) {
  return (
    <>
      <PageTitle>Pedidos</PageTitle>
      <Suspense fallback={<p className="mt-6 text-bege">Carregando…</p>}>
        <List searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function List({ searchParams }: { searchParams: PageProps<"/admin/pedidos">["searchParams"] }) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" && sp.status in ORDER_STATUS ? sp.status : null;
  const { supabase } = await requireAdmin();
  let q = supabase.from("orders").select("id, number, status, total_cents, payment_method, created_at, utm_source, customers(name, email)").order("created_at", { ascending: false }).limit(100);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (
    <>
      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        <Link href="/admin/pedidos" className={`pilula px-3 py-1.5 ${!status ? "bg-grafite text-white" : "bg-creme-2"}`}>Todos</Link>
        {Object.entries(ORDER_STATUS).map(([k, v]) => (
          <Link key={k} href={`/admin/pedidos?status=${k}`} className={`pilula px-3 py-1.5 ${status === k ? "bg-grafite text-white" : "bg-creme-2"}`}>{v}</Link>
        ))}
      </div>
      {!data.length ? (
        <p className="painel mt-6 p-8 text-center text-bege">Nenhum pedido{status ? " com este status" : " ainda"}.</p>
      ) : (
        <ul className="mt-6 divide-y divide-linha overflow-hidden rounded-[24px] bg-creme-2">
          {data.map((o) => {
            const c = o.customers as unknown as { name: string | null; email: string };
            return (
              <li key={o.id}>
                <Link href={`/admin/pedidos/${o.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-[#ececf0]">
                  <div>
                    <p className="font-semibold">#{o.number} · {c?.name ?? c?.email}</p>
                    <p className="text-sm text-bege">{dateTime(o.created_at)} · {o.payment_method === "pix" ? "Pix" : "Cartão"}{o.utm_source ? ` · origem: ${o.utm_source}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Money cents={o.total_cents} />
                    <Badge tone={toneFor(o.status)}>{ORDER_STATUS[o.status] ?? o.status}</Badge>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
