"use client";

import { useActionState } from "react";
import { definirNovaSenha, enviarLinkAcesso, enviarRedefinicaoSenha, type LinkState } from "./actions";

function EmailForm({ action, button, okText }: { action: (p: LinkState, f: FormData) => Promise<LinkState>; button: string; okText: string }) {
  const [state, run, pending] = useActionState<LinkState, FormData>(action, {});
  if (state.ok) return <p className="painel mt-8 p-6 text-[17px]">{okText}</p>;
  return (
    <form action={run} className="mt-8 grid gap-3 text-left">
      <label className="grid gap-1.5 text-sm font-medium">
        E-mail
        <input name="email" type="email" required autoComplete="email" className="campo" />
      </label>
      {state.erro && <p role="alert" className="rounded-xl bg-[#fff1f0] px-4 py-3 text-sm text-[#c4291c]">{state.erro}</p>}
      <button disabled={pending} className="btn btn-pink justify-center disabled:opacity-60">{pending ? "Enviando…" : button}</button>
    </form>
  );
}

export function AccessLinkForm() {
  return <EmailForm action={enviarLinkAcesso} button="Receber link de acesso" okText="Pronto! Enviamos um link para o seu e-mail. Abra-o neste aparelho para entrar." />;
}

export function ResetPasswordForm() {
  return <EmailForm action={enviarRedefinicaoSenha} button="Enviar link para nova senha" okText="Se houver uma conta com esse e-mail, você vai receber um link para criar uma nova senha." />;
}

export function NewPasswordForm() {
  const [state, run, pending] = useActionState<LinkState, FormData>(definirNovaSenha, {});
  if (state.ok) return <p className="painel mt-8 p-6">Senha alterada. <a href="/admin" className="text-pink underline">Ir para o painel</a></p>;
  return (
    <form action={run} className="mt-8 grid gap-3 text-left">
      <label className="grid gap-1.5 text-sm font-medium">Nova senha<input name="senha" type="password" required minLength={10} autoComplete="new-password" className="campo" /></label>
      <label className="grid gap-1.5 text-sm font-medium">Repita a senha<input name="confirmar" type="password" required autoComplete="new-password" className="campo" /></label>
      {state.erro && <p role="alert" className="rounded-xl bg-[#fff1f0] px-4 py-3 text-sm text-[#c4291c]">{state.erro}</p>}
      <button disabled={pending} className="btn btn-pink justify-center disabled:opacity-60">{pending ? "Salvando…" : "Salvar nova senha"}</button>
    </form>
  );
}
