import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase no navegador, com a sessão de quem está logado (cookies).
 * Usado no painel para enviar arquivos grandes direto ao Storage, sem passar
 * pelo servidor (as regras de segurança do banco só deixam a admin enviar).
 */
export function getBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("A loja ainda não está conectada ao Supabase.");
  return createBrowserClient(url, key);
}
