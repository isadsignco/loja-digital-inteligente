-- =============================================================================
-- Ajustes apontados pela checagem de segurança do Supabase (08/11/2026).
-- =============================================================================

-- handle_new_user só roda pelo gatilho de cadastro (gatilhos não precisam de EXECUTE);
-- ninguém deve conseguir chamá-la pela API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- search_path fixo nas funções de gatilho, para ninguém trocar o schema por baixo delas.
alter function public.set_updated_at() set search_path = public, pg_temp;
alter function public.products_search_update() set search_path = public, pg_temp;
alter function public.lower_customer_email() set search_path = public, pg_temp;

-- Mantido de propósito: is_admin() continua liberada para anon/authenticated.
-- O painel e as regras de segurança (RLS) dependem dela, e ela só responde
-- se quem está logado é admin, sem expor dados.
