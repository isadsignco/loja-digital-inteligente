-- =============================================================================
-- Painel administrativo
-- 1. Dados internos do produto (design mestre do Canva, mapa de cores) vão para
--    uma tabela separada, visível só para admin. Assim o painel funciona com o
--    login da proprietária, sem precisar da chave secreta no navegador.
-- 2. Bucket público "vitrine" para fotos e mockups, com escrita só para admin.
-- =============================================================================

create table product_private (
  product_id uuid primary key references products(id) on delete cascade,
  canva_master_design_id text,
  customization_config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create trigger product_private_updated_at before update on product_private
  for each row execute function set_updated_at();

alter table product_private enable row level security;
create policy admin_all on product_private for all using (is_admin()) with check (is_admin());

insert into product_private (product_id, canva_master_design_id, customization_config)
  select id, canva_master_design_id, customization_config from products;

alter table products drop column canva_master_design_id;
alter table products drop column customization_config;

-- products agora só tem dados públicos (rascunhos continuam ocultos pela RLS)
grant select on products to anon, authenticated;

-- permite que o painel leia o próprio papel
grant execute on function is_admin() to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Storage: bucket público para imagens de vitrine
-- (no Supabase o schema storage existe; no teste local ele é simulado)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('vitrine', 'vitrine', true)
  on conflict (id) do nothing;

create policy vitrine_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'vitrine' and public.is_admin());
create policy vitrine_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'vitrine' and public.is_admin());
create policy vitrine_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'vitrine' and public.is_admin());
