"use client";

import { useState } from "react";
import type { ColorSlot } from "@/server/catalog";

/** Botão de compra + escolha de cores (produtos personalizáveis), com prévia instantânea da paleta. */
export function BuyBox({
  action,
  slots,
  cover,
}: {
  action: (form: FormData) => void;
  slots: ColorSlot[];
  cover: string | null;
}) {
  const [cores, setCores] = useState<Record<string, string>>(Object.fromEntries(slots.map((s) => [s.chave, s.padrao])));
  const reset = () => setCores(Object.fromEntries(slots.map((s) => [s.chave, s.padrao])));
  const values = slots.map((s) => cores[s.chave]);

  return (
    <form action={action} className="mt-6 grid gap-4">
      {slots.length > 0 && (
        <div className="rounded-[24px] bg-creme-2 p-5">
          <p className="font-semibold">Personalize com as cores da sua marca</p>
          <div className="mt-4 overflow-hidden rounded-2xl bg-white">
            {cover && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt="" className="aspect-[16/9] w-full object-cover opacity-90" />
            )}
            <div className="flex h-10">
              {values.map((c, i) => (
                <div key={i} className="flex-1 transition-colors" style={{ background: c }} />
              ))}
            </div>
          </div>
          <p className="mt-2 text-xs text-bege">
            Prévia da paleta. Depois do pagamento, você recebe as imagens reais da sua versão para aprovar antes do link final.
          </p>
          <div className="mt-4 grid gap-3">
            {slots.map((s) => (
              <label key={s.chave} className="flex items-center justify-between gap-3 text-[15px]">
                {s.rotulo}
                <span className="flex items-center gap-2">
                  <input
                    type="text"
                    value={cores[s.chave]}
                    onChange={(e) => /^#[0-9a-f]{0,6}$/i.test(e.target.value) && setCores({ ...cores, [s.chave]: e.target.value })}
                    className="w-24 rounded-lg border border-linha-forte px-2 py-1.5 font-mono text-sm"
                    aria-label={`Código da ${s.rotulo}`}
                  />
                  <input
                    type="color"
                    name={`cor_${s.chave}`}
                    value={/^#[0-9a-f]{6}$/i.test(cores[s.chave]) ? cores[s.chave] : s.padrao}
                    onChange={(e) => setCores({ ...cores, [s.chave]: e.target.value })}
                    className="h-10 w-12 cursor-pointer rounded-lg border border-linha-forte bg-white"
                  />
                </span>
              </label>
            ))}
          </div>
          <button type="button" onClick={reset} className="mt-3 text-sm text-pink hover:underline">
            Restaurar cores originais
          </button>
        </div>
      )}
      <button className="btn btn-pink justify-center text-[17px]">Adicionar ao carrinho</button>
    </form>
  );
}
