import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { formatPrice } from "@/lib/format";
import { getCartView } from "@/server/cart-view";
import { removerDoCarrinho } from "./actions";

export const metadata: Metadata = { title: "Carrinho", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="mx-auto max-w-[692px] px-5 py-12">
      <h1 className="titulo text-[40px]">Carrinho</h1>
      <Suspense fallback={<p className="mt-6 text-bege">Carregando…</p>}>
        <Cart />
      </Suspense>
    </div>
  );
}

async function Cart() {
  const cart = await getCartView();
  if (!cart.items.length) {
    return (
      <div className="painel mt-8 p-10 text-center">
        <p className="titulo text-[24px]">Seu carrinho está vazio</p>
        {cart.problems.map((p) => (
          <p key={p} className="mt-2 text-sm text-bege">{p}</p>
        ))}
        <Link href="/catalogo" className="btn btn-pink mt-6">Ver catálogo</Link>
      </div>
    );
  }
  return (
    <>
      {cart.problems.length > 0 && (
        <p className="mt-6 rounded-xl bg-creme-2 px-4 py-3 text-sm">{cart.problems.join(" ")}</p>
      )}
      <ul className="mt-8 divide-y divide-linha">
        {cart.items.map((i, idx) => (
          <li key={idx} className="flex items-start justify-between gap-4 py-5">
            <div>
              <p className="font-semibold">{i.product.commercial_name}</p>
              {i.cores && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-bege">
                  Suas cores:
                  {Object.values(i.cores).map((c) => (
                    <span key={c} className="inline-block h-4 w-4 rounded-full border border-linha" style={{ background: c }} />
                  ))}
                </p>
              )}
              <form action={removerDoCarrinho.bind(null, cart.lines.findIndex((l) => l.productId === i.product.id))}>
                <button className="mt-2 text-sm text-pink hover:underline">Remover</button>
              </form>
            </div>
            <p className="font-semibold">{formatPrice(i.unitPriceCents)}</p>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center justify-between border-t border-linha pt-5 text-[21px]">
        <span>Total</span>
        <span className="font-semibold">{formatPrice(cart.totalCents)}</span>
      </div>
      <Link href="/checkout" className="btn btn-pink mt-6 w-full justify-center">Finalizar compra</Link>
    </>
  );
}
