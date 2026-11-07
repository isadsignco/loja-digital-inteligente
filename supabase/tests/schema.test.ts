/**
 * Valida a migração do banco num Postgres real (PGlite), simulando o ambiente
 * do Supabase (papéis anon/authenticated, schema auth e privilégios padrão).
 * Testa as regras de segurança (RLS) que protegem dados de clientes.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";
import { beforeAll, describe, expect, it } from "vitest";

const MIGRATIONS_DIR = join(__dirname, "..", "migrations");

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon, authenticated;
  grant all on storage.objects to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;

const ADMIN = "00000000-0000-0000-0000-00000000000a";
const ANA = "00000000-0000-0000-0000-0000000000a1";
const BIA = "00000000-0000-0000-0000-0000000000b1";

let db: PGlite;

async function as<T>(role: "anon" | "authenticated", userId: string | null, fn: () => Promise<T>) {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${userId ?? ""}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}

beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto, unaccent } });
  await db.exec(SUPABASE_STUB);
  for (const file of readdirSync(MIGRATIONS_DIR).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }

  // cenário de teste (apenas no banco em memória do teste)
  await db.exec(`
    insert into auth.users (id, email) values
      ('${ADMIN}', 'admin@teste.local'), ('${ANA}', 'ana@teste.local'), ('${BIA}', 'bia@teste.local');
    update profiles set role = 'admin' where id = '${ADMIN}';
    insert into categories (slug, name) values ('posts', 'Posts');
    insert into products (id, slug, creative_name, commercial_name, price_cents, status)
      values ('00000000-0000-0000-0000-0000000000e1', 'pack-ativo', 'Coração Apertado', 'Pack Pet 25 posts', 2700, 'ativo'),
             ('00000000-0000-0000-0000-0000000000e2', 'pack-rascunho', 'Rascunho', 'Pack em revisão', 1900, 'rascunho');
    insert into product_private (product_id, canva_master_design_id)
      values ('00000000-0000-0000-0000-0000000000e1', 'DAH-SEGREDO');
    insert into customers (id, user_id, email) values
      ('00000000-0000-0000-0000-0000000000c1', '${ANA}', 'ana@teste.local'),
      ('00000000-0000-0000-0000-0000000000c2', '${BIA}', 'bia@teste.local');
    insert into orders (id, customer_id, subtotal_cents, total_cents) values
      ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 2700, 2700),
      ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c2', 2700, 2700);
  `);
});

describe("migração e segurança do banco", () => {
  it("cria o perfil automaticamente ao cadastrar usuário", async () => {
    const r = await db.query<{ n: number }>("select count(*)::int as n from profiles");
    expect(r.rows[0].n).toBe(3);
  });

  it("visitante vê só produtos ativos", async () => {
    const r = await as("anon", null, () => db.query<{ slug: string }>("select slug from products_public"));
    expect(r.rows.map((x) => x.slug)).toEqual(["pack-ativo"]);
  });

  it("visitante e cliente não leem o design mestre do Canva", async () => {
    const anon = await as("anon", null, () => db.query("select * from product_private"));
    expect(anon.rows).toHaveLength(0);
    const cliente = await as("authenticated", ANA, () => db.query("select * from product_private"));
    expect(cliente.rows).toHaveLength(0);
  });

  it("admin lê o design mestre e vê rascunhos", async () => {
    const priv = await as("authenticated", ADMIN, () =>
      db.query<{ canva_master_design_id: string }>("select canva_master_design_id from product_private"),
    );
    expect(priv.rows[0].canva_master_design_id).toBe("DAH-SEGREDO");
    const prods = await as("authenticated", ADMIN, () => db.query("select id from products"));
    expect(prods.rows).toHaveLength(2);
  });

  it("admin cadastra produto; cliente não consegue", async () => {
    const insert = (slug: string) =>
      `insert into products (slug, creative_name, commercial_name, price_cents) values ('${slug}', 'Novo', 'Novo pack', 1000)`;
    await as("authenticated", ADMIN, () => db.query(insert("novo-1")));
    await expect(as("authenticated", ANA, () => db.query(insert("novo-2")))).rejects.toThrow(/row-level security/);
  });

  it("só admin envia imagem para o bucket vitrine", async () => {
    await as("authenticated", ADMIN, () =>
      db.query("insert into storage.objects (bucket_id, name) values ('vitrine', 'a.png')"),
    );
    await expect(
      as("authenticated", ANA, () => db.query("insert into storage.objects (bucket_id, name) values ('vitrine', 'b.png')")),
    ).rejects.toThrow(/row-level security/);
  });

  it("cliente vê apenas os próprios pedidos", async () => {
    const r = await as("authenticated", ANA, () => db.query<{ id: string }>("select id from orders"));
    expect(r.rows.map((x) => x.id)).toEqual(["00000000-0000-0000-0000-0000000000d1"]);
  });

  it("cliente não consegue alterar o status de um pedido", async () => {
    await as("authenticated", ANA, () =>
      db.query("update orders set status = 'pago' where id = '00000000-0000-0000-0000-0000000000d1'"),
    );
    const r = await db.query<{ status: string }>(
      "select status from orders where id = '00000000-0000-0000-0000-0000000000d1'",
    );
    expect(r.rows[0].status).toBe("pendente");
  });

  it("visitante não lê clientes", async () => {
    const r = await as("anon", null, () => db.query("select * from customers"));
    expect(r.rows).toHaveLength(0);
  });

  it("admin vê todos os pedidos", async () => {
    const r = await as("authenticated", ADMIN, () => db.query("select id from orders"));
    expect(r.rows).toHaveLength(2);
  });

  it("pagamento duplicado do mesmo provedor é recusado", async () => {
    const insert = `insert into payments (order_id, provider_payment_id, method, status, amount_cents)
                    values ('00000000-0000-0000-0000-0000000000d1', 'MP-123', 'pix', 'approved', 2700)`;
    await db.query(insert);
    await expect(db.query(insert)).rejects.toThrow(/duplicate key/);
  });

  it("evento de webhook repetido é recusado", async () => {
    const insert = `insert into webhook_events (provider, event_key, signature_valid, payload)
                    values ('mercadopago', 'req-1', true, '{}')`;
    await db.query(insert);
    await expect(db.query(insert)).rejects.toThrow(/duplicate key/);
  });

  it("busca encontra produto ignorando acentos (como visitante)", async () => {
    const r = await as("anon", null, () => db.query<{ slug: string }>(
      "select slug from products where search_vector @@ plainto_tsquery('portuguese', unaccent('coracao'))",
    ));
    expect(r.rows.map((x) => x.slug)).toEqual(["pack-ativo"]);
  });
});
