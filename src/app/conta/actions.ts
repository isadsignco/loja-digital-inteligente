"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { notifyAdmin } from "@/server/automations";
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
  redirect("/conta");
}

export async function abrirSuporte(form: FormData) {
  const supabase = await getServerSupabase();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user?.email) redirect("/conta");
  const assunto = String(form.get("assunto") ?? "").trim().slice(0, 140);
  const mensagem = String(form.get("mensagem") ?? "").trim().slice(0, 4000);
  const orderId = String(form.get("pedido") ?? "") || null;
  if (assunto.length < 3 || mensagem.length < 5) redirect("/conta?suporte=erro");
  const db = getAdminSupabase();
  const { data: c } = await db.from("customers").select("id").eq("email", u.user.email.toLowerCase()).maybeSingle();
  if (!c) redirect("/conta?suporte=erro");
  // só aceita pedido que seja do próprio cliente
  const validOrder = orderId ? (await db.from("orders").select("id").eq("id", orderId).eq("customer_id", c.id).maybeSingle()).data?.id ?? null : null;
  const { data: t } = await db.from("support_tickets").insert({ customer_id: c.id, order_id: validOrder, subject: assunto }).select("id").single();
  if (t) await db.from("support_messages").insert({ ticket_id: t.id, author: "cliente", body: mensagem });
  await notifyAdmin(db, "suporte", `Suporte: ${assunto}`, mensagem.slice(0, 300), c.id);
  redirect("/conta?suporte=ok");
}
