-- =============================================================================
-- Loja Digital Inteligente — esquema inicial
-- Valores monetários em centavos (integer). Datas em timestamptz (UTC).
-- Segurança: RLS ligado em todas as tabelas. Escritas sensíveis (pedidos,
-- pagamentos, entregas) são feitas somente pelo servidor com a service role.
-- =============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "unaccent";

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
create type product_line as enum ('original', 'ai_design', 'personalizado');
create type product_status as enum ('rascunho', 'aguardando_aprovacao', 'ativo', 'inativo', 'arquivado');
create type product_origin as enum ('manual', 'ia');
create type media_kind as enum ('imagem', 'mockup', 'video');
create type order_status as enum ('pendente', 'pago', 'cancelado', 'expirado', 'reembolsado', 'reembolso_parcial');
create type payment_status as enum ('pending', 'in_process', 'authorized', 'approved', 'rejected', 'cancelled', 'refunded', 'charged_back');
create type payment_method as enum ('pix', 'cartao');
create type delivery_status as enum ('aguardando_pagamento', 'na_fila', 'gerando', 'aguardando_aprovacao_cliente', 'aguardando_link_manual', 'entregue', 'falhou');
create type message_channel as enum ('email', 'whatsapp');
create type message_kind as enum ('transacional', 'promocional');
create type outbox_status as enum ('pendente', 'enviando', 'enviado', 'falhou', 'cancelado');
create type run_status as enum ('executando', 'sucesso', 'falhou', 'ignorado');
create type content_status as enum ('rascunho', 'aprovado', 'agendado', 'publicando', 'publicado', 'falhou', 'requer_acao_manual', 'cancelado');
create type social_platform as enum ('pinterest', 'instagram', 'tiktok');
create type consent_purpose as enum ('email_marketing', 'whatsapp_marketing', 'whatsapp_transacional', 'cookies_analytics');

-- -----------------------------------------------------------------------------
-- Utilitários
-- -----------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- -----------------------------------------------------------------------------
-- Perfis e papéis
-- -----------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'cliente' check (role in ('cliente', 'admin')),
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- cria o perfil automaticamente quando um usuário se cadastra
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name) values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- -----------------------------------------------------------------------------
-- Catálogo
-- -----------------------------------------------------------------------------
create table categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references categories(id) on delete set null,
  slug text not null unique,
  name text not null,
  description text,
  position int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  line product_line not null default 'original',
  status product_status not null default 'rascunho',
  origin product_origin not null default 'manual',
  category_id uuid references categories(id) on delete set null,

  -- comercial
  creative_name text not null,
  commercial_name text not null,
  description text not null default '',
  target_audience text,
  ideal_for text,
  benefits text[] not null default '{}',
  differentials text[] not null default '{}',
  price_cents int not null check (price_cents >= 0),
  promo_price_cents int check (promo_price_cents is null or promo_price_cents >= 0),
  keywords text[] not null default '{}',

  -- técnico
  product_type text not null default 'pack_posts',   -- pack_posts, pack_stories, stickers, kit_identidade, frases, planner...
  formats text[] not null default '{}',
  file_count int,
  canva_template_url text,        -- link de template entregue ao cliente (produto sem personalização)
  canva_master_design_id text,    -- design mestre que o agente copia para personalizar (nunca exposto ao cliente)
  usage_instructions text,

  -- personalização
  customizable boolean not null default false,
  customization_config jsonb not null default '{}'::jsonb, -- mapa de cores editáveis, limites etc.

  -- destaque na vitrine
  featured boolean not null default false,
  is_new boolean not null default false,

  -- validade e disponibilidade
  published_at timestamptz,
  commercial_valid_until timestamptz,
  access_days int,                -- null = acesso sem prazo
  available boolean not null default true,

  -- IA
  ai_job_id uuid,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,

  search_vector tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_status_idx on products(status);
create index products_category_idx on products(category_id);
create index products_search_idx on products using gin(search_vector);

create or replace function products_search_update() returns trigger
language plpgsql as $$
begin
  new.search_vector :=
    setweight(to_tsvector('portuguese', unaccent(coalesce(new.commercial_name, ''))), 'A') ||
    setweight(to_tsvector('portuguese', unaccent(coalesce(new.creative_name, ''))), 'A') ||
    setweight(to_tsvector('portuguese', unaccent(array_to_string(new.keywords, ' '))), 'B') ||
    setweight(to_tsvector('portuguese', unaccent(coalesce(new.description, ''))), 'C');
  return new;
end $$;

create trigger products_search before insert or update on products
  for each row execute function products_search_update();

create table collection_products (
  collection_id uuid references collections(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  position int not null default 0,
  primary key (collection_id, product_id)
);

create table product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  kind media_kind not null default 'imagem',
  storage_path text not null,     -- bucket público "vitrine"
  alt text not null default '',
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index product_media_product_idx on product_media(product_id, position);

create table product_files (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  kind text not null check (kind in ('original', 'final')),
  storage_path text not null,     -- bucket PRIVADO "arquivos"
  format text not null,
  size_bytes bigint,
  checksum text,
  created_at timestamptz not null default now()
);

create table coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  percent_off int check (percent_off between 1 and 100),
  amount_off_cents int check (amount_off_cents > 0),
  valid_from timestamptz,
  valid_until timestamptz,
  max_uses int,
  used_count int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check ((percent_off is null) <> (amount_off_cents is null))
);

-- -----------------------------------------------------------------------------
-- Clientes e LGPD
-- -----------------------------------------------------------------------------
create table customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  email text not null unique,
  name text,
  phone text,
  internal_notes text,            -- visível só no painel
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table consents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  purpose consent_purpose not null,
  granted boolean not null,
  source text not null,           -- ex.: checkout, area_cliente, link_descadastro
  created_at timestamptz not null default now()
);
create index consents_customer_idx on consents(customer_id, purpose, created_at desc);

-- -----------------------------------------------------------------------------
-- Personalização, pedidos e pagamentos
-- -----------------------------------------------------------------------------
create table customizations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  session_key text,               -- carrinho anônimo
  choices jsonb not null,         -- ex.: {"cores": {"principal": "#4fb3a9"}}
  locked boolean not null default false,  -- travada ao virar pedido
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity unique,
  customer_id uuid not null references customers(id),
  status order_status not null default 'pendente',
  subtotal_cents int not null,
  discount_cents int not null default 0,
  total_cents int not null check (total_cents >= 0),
  coupon_id uuid references coupons(id),
  -- origem da venda (links rastreáveis / UTM)
  utm_source text, utm_medium text, utm_campaign text, utm_content text,
  tracking_link_id uuid,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_customer_idx on orders(customer_id, created_at desc);
create index orders_status_idx on orders(status, created_at desc);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  product_snapshot jsonb not null,  -- nome, preço, link etc. no momento da compra
  unit_price_cents int not null,
  customization_id uuid references customizations(id),
  created_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  provider text not null default 'mercadopago',
  provider_payment_id text not null,
  method payment_method not null,
  status payment_status not null,
  amount_cents int not null,
  raw jsonb,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_payment_id)       -- impede pagamento duplicado
);

create table webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_key text not null,         -- id da notificação / request-id
  signature_valid boolean not null,
  payload jsonb not null,
  processed_at timestamptz,
  error text,
  received_at timestamptz not null default now(),
  unique (provider, event_key)     -- evento repetido é ignorado
);

create table refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id),
  provider_refund_id text unique,
  amount_cents int not null,
  reason text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Entrega
-- -----------------------------------------------------------------------------
create table deliveries (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null unique references order_items(id) on delete cascade, -- nunca duas entregas por item
  status delivery_status not null default 'aguardando_pagamento',
  canva_design_id text,            -- cópia personalizada (quando houver)
  canva_link text,                 -- link entregue ao cliente
  attempts int not null default 0,
  last_error text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table delivery_files (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references deliveries(id) on delete cascade,
  storage_path text not null,
  format text not null,
  checksum text,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table download_grants (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references order_items(id) on delete cascade,
  expires_at timestamptz,
  download_count int not null default 0,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Mensagens (outbox) e atendimento
-- -----------------------------------------------------------------------------
create table message_templates (
  key text primary key,            -- ex.: pedido_recebido, pagamento_aprovado, produto_disponivel
  channel message_channel not null,
  kind message_kind not null default 'transacional',
  subject text,
  body text not null,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table outbox_messages (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique, -- ex.: email:pagamento_aprovado:<order_id> — nunca envia duas vezes
  channel message_channel not null,
  kind message_kind not null,
  template_key text references message_templates(key),
  customer_id uuid references customers(id),
  recipient text not null,
  payload jsonb not null default '{}'::jsonb,
  status outbox_status not null default 'pendente',
  attempts int not null default 0,
  provider_message_id text,
  last_error text,
  send_after timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index outbox_pending_idx on outbox_messages(status, send_after);

create table support_tickets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  order_id uuid references orders(id),
  subject text not null,
  status text not null default 'aberto' check (status in ('aberto', 'respondido', 'resolvido')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references support_tickets(id) on delete cascade,
  author text not null check (author in ('cliente', 'loja', 'agente')),
  body text not null,
  created_at timestamptz not null default now()
);

create table customer_interactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  channel text not null,           -- whatsapp, email, telefone, nota
  summary text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- IA, marketing e automações
-- -----------------------------------------------------------------------------
create table ai_jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null,              -- cadastro_produto, pack, stickers, pins, mapa_cores...
  input jsonb not null,
  output jsonb,
  status run_status not null default 'executando',
  model text,
  input_tokens int, output_tokens int,
  cost_usd numeric(10, 4),
  error text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table social_accounts (
  id uuid primary key default gen_random_uuid(),
  platform social_platform not null unique,
  account_name text,
  access_token_encrypted text,     -- criptografado pela aplicação, nunca em texto puro
  refresh_token_encrypted text,
  expires_at timestamptz,
  connected_at timestamptz not null default now()
);

create table tracking_links (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  target_path text not null,
  utm_source text, utm_medium text, utm_campaign text, utm_content text,
  content_item_id uuid,
  created_at timestamptz not null default now()
);

create table link_clicks (
  id bigint generated always as identity primary key,
  tracking_link_id uuid not null references tracking_links(id) on delete cascade,
  clicked_at timestamptz not null default now()
);

create table content_items (
  id uuid primary key default gen_random_uuid(),
  platform social_platform not null,
  format text not null,            -- pin, pin_video, reel, story, carrossel, roteiro_tiktok
  product_id uuid references products(id) on delete set null,
  title text,
  caption text,
  media jsonb not null default '[]'::jsonb,
  status content_status not null default 'rascunho',
  scheduled_at timestamptz,
  published_at timestamptz,
  external_id text,
  manual_action_reason text,       -- explica por que a API não permite publicar sozinho
  tracking_link_id uuid references tracking_links(id),
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table orders add constraint orders_tracking_link_fk
  foreign key (tracking_link_id) references tracking_links(id) on delete set null;

create table post_metrics (
  id bigint generated always as identity primary key,
  content_item_id uuid not null references content_items(id) on delete cascade,
  metric text not null,            -- impressions, clicks, saves, reach...
  value numeric not null,
  source text not null,            -- pinterest_api, instagram_api...
  fetched_at timestamptz not null default now()
);

create table automations (
  key text primary key,            -- entrega_automatica, whatsapp_confirmacao, publicar_pinterest...
  description text not null,
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table automation_runs (
  id uuid primary key default gen_random_uuid(),
  automation_key text not null references automations(key),
  ref text,                        -- id do pedido, post etc.
  status run_status not null default 'executando',
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index automation_runs_idx on automation_runs(automation_key, started_at desc);

create table admin_notifications (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  title text not null,
  body text,
  ref text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table audit_logs (
  id bigint generated always as identity primary key,
  actor uuid references auth.users(id),
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Gatilhos de updated_at
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['profiles','categories','collections','products','customers','customizations',
                           'orders','payments','deliveries','support_tickets','content_items']
  loop
    execute format('create trigger %I_updated_at before update on %I for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table %I enable row level security', t);
    -- admin pode tudo (pelo painel, autenticado e com papel admin)
    execute format('create policy admin_all on %I for all using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;

-- leitura pública do catálogo (apenas itens ativos)
create policy public_read on categories for select using (active);
create policy public_read on collections for select using (active);
create policy public_read on products for select using (status = 'ativo' and available);
create policy public_read on collection_products for select using (true);
create policy public_read on product_media for select using (
  exists (select 1 from products p where p.id = product_id and p.status = 'ativo')
);

-- o cliente vê apenas o que é dele
create policy own_profile on profiles for select using (id = auth.uid());
create policy own_customer on customers for select using (user_id = auth.uid());
create policy own_orders on orders for select using (
  customer_id in (select id from customers where user_id = auth.uid())
);
create policy own_order_items on order_items for select using (
  order_id in (select o.id from orders o join customers c on c.id = o.customer_id where c.user_id = auth.uid())
);
create policy own_deliveries on deliveries for select using (
  order_item_id in (
    select oi.id from order_items oi join orders o on o.id = oi.order_id
    join customers c on c.id = o.customer_id where c.user_id = auth.uid()
  )
);
create policy own_tickets on support_tickets for select using (
  customer_id in (select id from customers where user_id = auth.uid())
);
create policy own_ticket_messages on support_messages for select using (
  ticket_id in (select t.id from support_tickets t join customers c on c.id = t.customer_id where c.user_id = auth.uid())
);
create policy own_consents on consents for select using (
  customer_id in (select id from customers where user_id = auth.uid())
);

-- products_public: visão sem campos internos (design mestre, configuração) para o site
create view products_public with (security_invoker = true) as
  select id, slug, line, category_id, creative_name, commercial_name, description, target_audience,
         ideal_for, benefits, differentials, price_cents, promo_price_cents, keywords, product_type,
         formats, file_count, customizable, featured, is_new, published_at, access_days, created_at
  from products;

-- -----------------------------------------------------------------------------
-- Dados de configuração (não são dados fictícios: são as automações e modelos
-- de mensagem que o sistema usa; textos editáveis no painel)
-- -----------------------------------------------------------------------------
insert into automations (key, description) values
  ('entrega_automatica', 'Entregar o produto após pagamento confirmado'),
  ('personalizacao_canva', 'Copiar e recolorir o design no Canva para pedidos personalizados'),
  ('email_transacional', 'E-mails de pedido, pagamento e entrega'),
  ('whatsapp_resposta', 'Responder no WhatsApp quando o cliente pedir o link'),
  ('whatsapp_iniciado_pela_loja', 'Mensagens de WhatsApp iniciadas pela loja (pagas por mensagem)'),
  ('conferencia_pagamentos', 'Conferir pedidos pendentes no Mercado Pago (cobre webhook perdido)'),
  ('publicar_pinterest', 'Publicar Pins agendados'),
  ('metricas_redes', 'Coletar métricas das redes sociais');

update automations set enabled = false where key = 'whatsapp_iniciado_pela_loja';

-- -----------------------------------------------------------------------------
-- Colunas internas do produto (design mestre do Canva, configuração) nunca são
-- legíveis pelo navegador. O painel administrativo usa o servidor (service role)
-- depois de verificar o papel admin.
-- -----------------------------------------------------------------------------
revoke select on products from anon, authenticated;
grant select (id, slug, line, status, category_id, creative_name, commercial_name, description,
              target_audience, ideal_for, benefits, differentials, price_cents, promo_price_cents,
              keywords, product_type, formats, file_count, customizable, featured, is_new,
              published_at, access_days, available, created_at)
  on products to anon, authenticated;
grant select on products_public to anon, authenticated;
