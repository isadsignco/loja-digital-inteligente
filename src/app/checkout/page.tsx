import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { formatPrice } from "@/lib/format";
import { getCartView } from "@/server/cart-view";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Finalizar compra", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-[560px] px-5 py-12">
      <h1 className="titulo text-[40px]">Finalizar compra</h1>
      <Suspense fallback={<p className="mt-6 text-bege">Carregando…</p>}>
        <Summary />
      </Suspense>
    </div>
  );
}

async function Summary() {
  const cart = await getCartView();
  if (!cart.items.length) {
    return (
      <p className="mt-6 text-bege">
        Seu carrinho está vazio. <Link href="/catalogo" className="text-pink underline">Ver catálogo</Link>
      </p>
    );
  }
  return (
    <>
      <div className="painel mt-6 p-5">
        {cart.items.map((i, k) => (
          <p key={k} className="flex justify-between gap-3 py-1 text-[15px]">
            <span>{i.product.commercial_name}{i.cores ? " · personalizado" : ""}</span>
            <span>{formatPrice(i.unitPriceCents)}</span>
          </p>
        ))}
        <p className="mt-2 flex justify-between border-t border-linha pt-3 font-semibold">
          <span>Total</span>
          <span>{formatPrice(cart.totalCents)}</span>
        </p>
      </div>
      <CheckoutForm />
    </>
  );
}
