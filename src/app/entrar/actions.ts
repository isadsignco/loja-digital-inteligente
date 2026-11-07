"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase-server";

const schema = z.object({
  email: z.email("Informe um e-mail válido."),
  senha: z.string().min(1, "Informe a senha."),
  voltar: z.string().optional(),
});

export type LoginState = { erro?: string; email?: string };

export async function entrar(_prev: LoginState, form: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: form.get("email"),
    senha: form.get("senha"),
    voltar: form.get("voltar") || undefined,
  });
  if (!parsed.success) return { erro: parsed.error.issues[0].message, email: String(form.get("email") ?? "") };

  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.senha,
  });
  if (error) {
    const msg = /invalid login credentials/i.test(error.message)
      ? "E-mail ou senha incorretos."
      : /email not confirmed/i.test(error.message)
        ? "E-mail ainda não confirmado."
        : "Não foi possível entrar agora. Tente de novo.";
    return { erro: msg, email: parsed.data.email };
  }

  const destino = parsed.data.voltar?.startsWith("/admin") ? parsed.data.voltar : "/admin";
  redirect(destino);
}

export async function sair() {
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
  redirect("/entrar");
}
