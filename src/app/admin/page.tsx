import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/server/auth";

export default function AdminHome() {
  return (
    <Suspense fallback={<p className="text-bege">Carregando…</p>}>
      <Overview />
    </Suspense>
  );
}

async function count(q: PromiseLike<{ count: number | null; error: unknown }>) {
  const { count, error } = await q;
  return error ? null : (count ?? 0);
}

async function Overview() {
  const { supabase } = await requireAdmin();
  const head = { count: "exact" as const, head: true };
  const [ativos, rascunhos, aguardando, pedidosPagos, entregasPendentes, falhas] = await Promise.all([
    count(supabase.from("products").select("id", head).eq("status", "ativo")),
    count(supabase.from("products").select("id", head).eq("status", "rascunho")),
    count(supabase.from("products").select("id", head).eq("status", "aguardando_aprovacao")),
    count(supabase.from("orders").select("id", head).eq("status", "pago")),
    count(supabase.from("deliveries").select("id", head).in("status", ["na_fila", "gerando", "aguardando_link_manual"])),
    count(supabase.from("deliveries").select("id", head).eq("status", "falhou")),
  ]);

  const cards = [
    ["Produtos publicados", ativos, "/admin/produtos"],
    ["Rascunhos", rascunhos, "/admin/produtos"],
    ["Aguardando aprovação", aguardando, "/admin/produtos"],
    ["Pedidos pagos", pedidosPagos, null],
    ["Entregas pendentes", entregasPendentes, null],
    ["Falhas de entrega", falhas, null],
  ] as const;

  return (
    <>
      <h1 className="titulo text-[40px]">Visão geral</h1>
      <p className="mt-2 text-bege">Números lidos direto do banco. Vendas e entregas começam a aparecer quando o checkout entrar no ar.</p>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {cards.map(([label, value, href]) => {
          const body = (
            <>
              <p className="text-sm text-bege">{label}</p>
              <p className="titulo mt-2 text-[40px]">{value ?? "—"}</p>
              {value === null && <p className="text-xs text-bege">Indisponível</p>}
            </>
          );
          return href ? (
            <Link key={label} href={href} className="painel p-5 hover:bg-[#ececf0]">
              {body}
            </Link>
          ) : (
            <div key={label} className="painel p-5">
              {body}
            </div>
          );
        })}
      </div>
    </>
  );
}
