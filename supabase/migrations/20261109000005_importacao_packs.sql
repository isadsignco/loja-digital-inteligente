-- =============================================================================
-- Importação de packs do "Packs isadsign" (gerador em lote no Claude).
-- O ZIP baixado no Packs é enviado na Central de Criação; o painel guarda o ZIP
-- no bucket PRIVADO "arquivos", sobe algumas artes para a vitrine e cria o
-- produto como "aguardando_aprovacao". Nada é publicado sem a aprovação da admin.
-- =============================================================================

-- origem nova, para os relatórios saberem que o produto veio do Packs
alter type product_origin add value if not exists 'packs';

-- bucket privado dos arquivos entregues ao cliente (ZIPs, PNGs finais)
insert into storage.buckets (id, name, public)
  values ('arquivos', 'arquivos', false)
  on conflict (id) do nothing;

-- só a admin envia, lê e apaga; o cliente baixa por link assinado gerado no servidor
create policy arquivos_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'arquivos' and public.is_admin());
create policy arquivos_admin_select on storage.objects for select to authenticated
  using (bucket_id = 'arquivos' and public.is_admin());
create policy arquivos_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'arquivos' and public.is_admin());
