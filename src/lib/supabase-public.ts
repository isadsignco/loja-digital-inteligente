import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase para leituras públicas (catálogo). Usa apenas a chave
 * pública; as regras de segurança (RLS) do banco decidem o que é visível.
 * Retorna null enquanto o projeto Supabase não estiver configurado.
 */
export function getPublicSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function publicMediaUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base ? `${base}/storage/v1/object/public/vitrine/${path}` : "";
}
