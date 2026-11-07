import "server-only";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase-server";

/** Garante que quem está acessando é admin. Retorna o cliente com a sessão. */
export async function requireAdmin() {
  const supabase = await getServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) redirect("/entrar?voltar=/admin");

  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error) throw new Error(`Falha ao verificar permissão: ${error.message}`);
  if (!isAdmin) redirect("/entrar?erro=sem-permissao");

  return { supabase, user };
}
