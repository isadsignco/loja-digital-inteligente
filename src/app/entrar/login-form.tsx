"use client";

import { useActionState } from "react";
import { entrar, type LoginState } from "./actions";

export function LoginForm({ voltar }: { voltar?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(entrar, {});
  return (
    <form action={action} className="mt-8 grid gap-3 text-left">
      {voltar && <input type="hidden" name="voltar" value={voltar} />}
      <label className="grid gap-1.5 text-sm font-medium">
        E-mail
        <input name="email" type="email" required autoComplete="email" defaultValue={state.email} className="campo" />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Senha
        <input name="senha" type="password" required autoComplete="current-password" className="campo" />
      </label>
      {state.erro && (
        <p role="alert" className="rounded-xl bg-[#fff1f0] px-4 py-3 text-sm text-[#c4291c]">
          {state.erro}
        </p>
      )}
      <button disabled={pending} className="btn btn-pink mt-2 justify-center disabled:opacity-60">
        {pending ? "Entrando…" : "Entrar"}
      </button>
      <a href="/entrar/esqueci" className="mt-1 text-center text-sm text-pink hover:underline">Esqueci minha senha</a>
    </form>
  );
}
