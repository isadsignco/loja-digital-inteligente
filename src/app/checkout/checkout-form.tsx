"use client";

import Link from "next/link";
import { useActionState } from "react";
import { finalizarCompra, type CheckoutState } from "./actions";

export function CheckoutForm() {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(finalizarCompra, {});
  return (
    <form action={action} className="mt-8 grid gap-4">
      <label className="grid gap-1.5 text-sm font-medium">
        Nome
        <input name="nome" required autoComplete="name" className="campo" />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        E-mail <span className="font-normal text-bege">o link do produto chega aqui</span>
        <input name="email" type="email" required autoComplete="email" className="campo" />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        WhatsApp <span className="font-normal text-bege">opcional</span>
        <input name="telefone" type="tel" autoComplete="tel" placeholder="(11) 91234-5678" className="campo" />
      </label>

      <fieldset className="mt-2 grid gap-2">
        <legend className="mb-2 text-sm font-medium">Pagamento</legend>
        <label className="flex items-center gap-3 rounded-2xl border border-linha-forte p-4 has-[:checked]:border-pink">
          <input type="radio" name="metodo" value="pix" defaultChecked className="accent-[#0071e3]" />
          <span><b className="font-semibold">Pix</b> <span className="text-sm text-bege">· aprovação na hora</span></span>
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-linha-forte p-4 has-[:checked]:border-pink">
          <input type="radio" name="metodo" value="cartao" className="accent-[#0071e3]" />
          <span><b className="font-semibold">Cartão de crédito</b> <span className="text-sm text-bege">· ambiente seguro do Mercado Pago</span></span>
        </label>
      </fieldset>

      <div className="mt-2 grid gap-2 text-sm">
        <label className="flex items-start gap-3">
          <input type="checkbox" name="aceite" required className="mt-0.5 h-4 w-4 accent-[#0071e3]" />
          <span>Li e aceito os <Link href="/termos" className="text-pink underline" target="_blank">termos de uso</Link> e a <Link href="/privacidade" className="text-pink underline" target="_blank">política de privacidade</Link>.</span>
        </label>
        <label className="flex items-start gap-3 text-bege">
          <input type="checkbox" name="mkt_email" className="mt-0.5 h-4 w-4 accent-[#0071e3]" />
          Quero receber novidades e ofertas por e-mail (opcional).
        </label>
        <label className="flex items-start gap-3 text-bege">
          <input type="checkbox" name="mkt_whatsapp" className="mt-0.5 h-4 w-4 accent-[#0071e3]" />
          Quero receber novidades pelo WhatsApp (opcional).
        </label>
      </div>

      {state.erro && <p role="alert" className="rounded-xl bg-[#fff1f0] px-4 py-3 text-sm text-[#c4291c]">{state.erro}</p>}
      <button disabled={pending} className="btn btn-pink mt-2 justify-center disabled:opacity-60">
        {pending ? "Gerando pagamento…" : "Ir para o pagamento"}
      </button>
    </form>
  );
}
