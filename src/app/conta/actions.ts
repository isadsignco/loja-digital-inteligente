"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase-server";

export type LinkState = { ok?: boolean; erro?: string };

async function origin() {
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}

export async function enviarLinkAcesso(_p: LinkState, form: FormData): Promise<LinkState> {
  const email = z.email().safeParse(String(form.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { erro: "Informe um e-mail válido." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { emailRedirectTo: `${await origin()}/auth/callback?next=/conta`, shouldCreateUser: true },
  });
  if (error) return { erro: /rate|limit/i.test(error.message) ? "Muitas tentativas. Aguarde alguns minutos." : "Não foi possível enviar o link agora." };
  return { ok: true };
}

export async function enviarRedefinicaoSenha(_p: LinkState, form: FormData): Promise<LinkState> {
  const email = z.email().safeParse(String(form.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { erro: "Informe um e-mail válido." };
  const supabase = await getServerSupabase();
  await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: `${await origin()}/auth/callback?next=/entrar/nova-senha` });
  // mesma resposta exista ou não a conta (não revela quem tem cadastro)
  return { ok: true };
}

export async function definirNovaSenha(_p: LinkState, form: FormData): Promise<LinkState> {
  const senha = String(form.get("senha") ?? "");
  if (senha.length < 10) return { erro: "Use pelo menos 10 caracteres." };
  if (senha !== form.get("confirmar")) return { erro: "As senhas não são iguais." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) return { erro: "O link expirou. Peça um novo em “Esqueci minha senha”." };
  return { ok: true };
}

export async function sairConta() {
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
  const { redirect } = await import("next/navigation");
  redirect("/conta");
}
