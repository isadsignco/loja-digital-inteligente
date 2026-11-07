import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/server/auth";
import { dateTime, Money, PageTitle } from "../ui";

export default function CustomersAdmin({ searchParams }: PageProps<"/admin/clientes">) {
  return (
    <>
      <PageTitle>Clientes</PageTitle>
      <Suspense fallback={<p className="mt-6 text-bege">Carregando…</p>}>
        <List searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function List({ searchParams }: { searchParams: PageProps<"/admin/clientes">["searchParams"] }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const { supabase } = await requireAdmin();
  let query = supabase.from("customers").select("id, name, email, phone, created_at, orders(total_cents, status)").order("created_at", { ascending: false }).limit(200);
  if (q) query = query.or(`email.ilike.%${q.replace(/[%,()]/g, "")}%,name.ilike.%${q.replace(/[%,()]/g, "")}%`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (
    <>
      <form className="mt-6 flex gap-2"><input name="q" defaultValue={q} placeholder="Buscar por nome ou e-mail" className="campo" /><button className="btn btn-pink">Buscar</button></form>
      {!data.length ? <p className="painel mt-6 p-8 text-center text-bege">Nenhum cliente{q ? " encontrado" : " ainda"}.</p> : (
        <ul className="mt-6 divide-y divide-linha overflow-hidden rounded-[24px] bg-creme-2">
          {data.map((c) => {
            const paid = (c.orders as { total_cents: number; status: string }[]).filter((o) => o.status === "pago");
            return (
              <li key={c.id}>
                <Link href={`/admin/clientes/${c.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-[#ececf0]">
                  <div><p className="font-semibold">{c.name ?? "—"}</p><p className="text-sm text-bege">{c.email} · desde {dateTime(c.created_at)}</p></div>
                  <p className="text-sm">{paid.length} compra{paid.length === 1 ? "" : "s"} · <Money cents={paid.reduce((s, o) => s + o.total_cents, 0)} />{paid.length > 1 && " · recorrente"}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
