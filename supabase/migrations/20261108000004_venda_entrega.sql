-- =============================================================================
-- Venda, entrega, área do cliente, personalização e marketing
-- =============================================================================

-- Pedido: token de acesso para a página do pedido (sem login) e dados de Pix
alter table orders add column access_token uuid not null default gen_random_uuid();
alter table orders add column payment_method payment_method;
alter table orders add column pix_qr_code text;
alter table orders add column pix_qr_base64 text;
alter table orders add column pix_expires_at timestamptz;
alter table orders add column checkout_url text;
create unique index orders_access_token_idx on orders(access_token);

-- Personalização: opções públicas que o cliente pode escolher (ex.: cores)
-- formato: {"cores":[{"chave":"principal","rotulo":"Cor principal","padrao":"#b793d6"}]}
alter table products add column customization_options jsonb not null default '{}'::jsonb;

-- E-mail de cliente sempre em minúsculas
create or replace function lower_customer_email() returns trigger language plpgsql as $$
begin
  new.email := lower(trim(new.email));
  return new;
end $$;
create trigger customers_lower_email before insert or update on customers
  for each row execute function lower_customer_email();

-- Ao criar login, vincula as compras feitas antes com o mesmo e-mail
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name) values (new.id, new.raw_user_meta_data->>'full_name')
    on conflict (id) do nothing;
  update customers set user_id = new.id where email = lower(new.email) and user_id is null;
  return new;
end $$;

-- Configurações da loja editáveis no painel (sem segredos)
create table store_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table store_settings enable row level security;
create policy admin_all on store_settings for all using (is_admin()) with check (is_admin());
create policy public_read on store_settings for select using (key in ('whatsapp_numero', 'nome_loja', 'email_contato'));
grant select on store_settings to anon, authenticated;

-- Fila de personalização: o cliente vê só o que é dele
create policy own_customizations on customizations for select using (
  customer_id in (select id from customers where user_id = auth.uid())
);

-- Pinterest: pasta padrão por produto/conteúdo
alter table content_items add column board text;
alter table content_items add column approved_at timestamptz;

-- -----------------------------------------------------------------------------
-- Mensagens automáticas padrão (texto editável no painel)
-- Marcadores: {{nome}} {{pedido}} {{itens}} {{links}} {{link_pedido}} {{loja}}
-- -----------------------------------------------------------------------------
insert into message_templates (key, channel, kind, subject, body) values
('pedido_recebido', 'email', 'transacional', 'Recebemos seu pedido #{{pedido}}',
 'Oi, {{nome}}!

Recebemos seu pedido #{{pedido}}:
{{itens}}

Assim que o pagamento for confirmado, você recebe o link do produto aqui no e-mail.
Acompanhe: {{link_pedido}}

{{loja}}'),
('produto_disponivel', 'email', 'transacional', 'Seu pedido #{{pedido}} chegou',
 'Oi, {{nome}}!

Pagamento confirmado. Seus produtos já estão disponíveis:

{{links}}

Como usar: abra o link, entre na sua conta do Canva e clique em "Usar modelo". Uma cópia fica salva na sua conta para editar à vontade.

Você também pode acessar tudo pela página do pedido: {{link_pedido}}

Qualquer dúvida, é só responder este e-mail.
{{loja}}'),
('personalizacao_em_andamento', 'email', 'transacional', 'Estamos preparando sua versão personalizada',
 'Oi, {{nome}}!

Pagamento confirmado. Estamos preparando a sua versão com as cores escolhidas e avisamos assim que estiver pronta.

Pedido: {{link_pedido}}
{{loja}}'),
('whatsapp_entrega', 'whatsapp', 'transacional', null,
 'Oi, {{nome}}! Aqui estão os links do seu pedido #{{pedido}}:

{{links}}

Abra no Canva e clique em "Usar modelo" para editar. Obrigada pela compra!'),
('pagamento_recusado', 'email', 'transacional', 'Pagamento não aprovado — pedido #{{pedido}}',
 'Oi, {{nome}}.

O pagamento do pedido #{{pedido}} não foi aprovado. Você pode tentar de novo por aqui: {{link_pedido}}

{{loja}}')
on conflict (key) do nothing;
