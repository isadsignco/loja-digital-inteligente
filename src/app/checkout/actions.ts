"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { getServerSupabase } from "@/lib/supabase-server";
import { readAttribution, readCart, writeCart } from "@/server/cart";
import { createOrder } from "@/server/orders";

const schema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome."),
  email: z.email("Informe um e-mail válido."),
  telefone: z
    .string()
    .trim()
    .transform((s) => s.replace(/\D/g, ""))
    .refine((s) => s === "" || (s.length >= 10 && s.length <= 13), "Telefone inválido. Use DDD + número."),
  metodo: z.enum(["pix", "cartao"]),
  aceite: z.literal("on", { error: "É preciso aceitar os termos de uso." }),
});

export type CheckoutState = { erro?: string };

export async function finalizarCompra(_prev: CheckoutState, form: FormData): Promise<CheckoutState> {
  const parsed = schema.safeParse({
    nome: form.get("nome"),
    email: form.get("email"),
    telefone: form.get("telefone") ?? "",
    metodo: form.get("metodo"),
    aceite: form.get("aceite"),
  });
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const lines = await readCart();
  if (!lines.length) return { erro: "Seu carrinho está vazio." };

  let userId: string | null = null;
  try {
    const { data } = await (await getServerSupabase()).auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    userId = null;
  }

  const { utm, trackingLinkId } = await readAttribution();
  const phone = parsed.data.telefone ? (parsed.data.telefone.length <= 11 ? `55${parsed.data.telefone}` : parsed.data.telefone) : null;

  let result;
  try {
    result = await createOrder(getAdminSupabase(), {
      name: parsed.data.nome,
      email: parsed.data.email,
      phone,
      method: parsed.data.metodo,
      lines,
      marketingEmail: form.get("mkt_email") === "on",
      marketingWhatsapp: form.get("mkt_whatsapp") === "on",
      userId,
      utm,
      trackingLinkId,
    });
  } catch (e) {
    console.error("checkout", e);
    return { erro: "Não foi possível iniciar o pagamento agora. Tente de novo em instantes." };
  }
  if (!result.ok) return { erro: result.error };

  await writeCart([]);
  redirect(`/pedido/${result.orderId}?t=${result.accessToken}`);
}
