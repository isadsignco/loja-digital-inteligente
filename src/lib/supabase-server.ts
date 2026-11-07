import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente Supabase com a sessão do usuário logado (cookies).
 * Usa só a chave pública: o que cada pessoa pode ver ou alterar é decidido
 * pelas regras de segurança (RLS) do banco.
 */
export async function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase não configurado (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY).");
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // chamado durante a renderização: o proxy já renova a sessão
        }
      },
    },
  });
}
