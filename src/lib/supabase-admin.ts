import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "./env";

/**
 * Cliente com a chave secreta (service role): ignora as regras de RLS.
 * Usado SOMENTE no servidor, em fluxos que não têm usuário logado e precisam
 * gravar com segurança: checkout, webhook de pagamento, entrega e mensagens.
 */
export function getAdminSupabase() {
  return createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
