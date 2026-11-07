"use server";

import { redirect } from "next/navigation";
import { readCart, writeCart } from "@/server/cart";

export async function adicionarAoCarrinho(productId: string, form: FormData) {
  const cores: Record<string, string> = {};
  for (const [k, v] of form.entries()) {
    if (k.startsWith("cor_") && typeof v === "string") cores[k.slice(4)] = v;
  }
  const cart = await readCart();
  cart.push({ productId, cores: Object.keys(cores).length ? cores : undefined });
  await writeCart(cart);
  redirect("/carrinho");
}

export async function removerDoCarrinho(index: number) {
  const cart = await readCart();
  cart.splice(index, 1);
  await writeCart(cart);
  redirect("/carrinho");
}
