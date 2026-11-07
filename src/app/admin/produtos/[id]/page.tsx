import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { publicMediaUrl } from "@/lib/supabase-public";
import { PRODUCT_TYPES } from "@/server/admin/product-input";
import { requireAdmin } from "@/server/auth";
import { criarCategoria, enviarMidias, moverMidia, removerMidia, salvarProduto } from "../actions";
import { productToDefaults } from "../defaults";
import { ProductForm } from "../product-form";

export default function EditProductPage({ params, searchParams }: PageProps<"/admin/produtos/[id]">) {
  return (
    <>
      <Link href="/admin/produtos" className="text-sm text-pink hover:underline">
        ‹ Produtos
      </Link>
      <Suspense fallback={<p className="mt-6 text-bege">Carregando…</p>}>
        <Editor params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Editor({
  params,
  searchParams,
}: {
  params: PageProps<"/admin/produtos/[id]">["params"];
  searchParams: PageProps<"/admin/produtos/[id]">["searchParams"];
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { supabase } = await requireAdmin();

  const [{ data: product }, { data: priv }, { data: categories }, { data: media }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).maybeSingle(),
    supabase.from("product_private").select("canva_master_design_id").eq("product_id", id).maybeSingle(),
    supabase.from("categories").select("id, name").order("position"),
    supabase.from("product_media").select("id, storage_path, alt, kind, position").eq("product_id", id).order("position"),
  ]);
  if (!product) notFound();

  return (
    <>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="titulo text-[36px]">{product.commercial_name}</h1>
        {product.status === "ativo" && (
          <Link href={`/produto/${product.slug}`} className="text-[15px] text-pink hover:underline" target="_blank">
            Ver na loja ›
          </Link>
        )}
      </div>
      {sp.ia && <p className="mt-3 rounded-xl bg-[#fff6e5] px-4 py-3 text-sm text-[#a05a00]">Rascunho criado pela IA. Revise os textos e o preço, adicione o link de template do Canva e as fotos, e mude o status para Ativo para publicar.</p>}
      {sp.salvo && <p className="mt-3 rounded-xl bg-[#eef8f0] px-4 py-3 text-sm text-lima">Produto criado. Agora adicione as fotos.</p>}

      <section id="midias" className="mt-8 rounded-[24px] bg-creme-2 p-5 sm:p-7">
        <h2 className="titulo text-[24px]">Fotos, mockups e vídeos</h2>
        <p className="mt-1 text-sm text-bege">A primeira imagem é a capa. JPG, PNG, WEBP, GIF ou MP4 de até 8 MB.</p>
        {media && media.length > 0 && (
          <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {media.map((m, i) => (
              <li key={m.id} className="overflow-hidden rounded-2xl bg-white">
                {m.kind === "video" ? (
                  <video src={publicMediaUrl(m.storage_path)} className="aspect-[4/5] w-full object-cover" muted />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={publicMediaUrl(m.storage_path)} alt={m.alt} className="aspect-[4/5] w-full object-cover" />
                )}
                <div className="flex items-center justify-between gap-1 p-2 text-xs">
                  <span className="text-bege">{i === 0 ? "Capa" : `#${i + 1}`}</span>
                  <span className="flex gap-1">
                    <form action={moverMidia.bind(null, id, m.id, "cima")}>
                      <button disabled={i === 0} aria-label="Mover para antes" className="rounded-full px-2 py-1 hover:bg-creme-2 disabled:opacity-30">
                        ←
                      </button>
                    </form>
                    <form action={moverMidia.bind(null, id, m.id, "baixo")}>
                      <button disabled={i === media.length - 1} aria-label="Mover para depois" className="rounded-full px-2 py-1 hover:bg-creme-2 disabled:opacity-30">
                        →
                      </button>
                    </form>
                    <form action={removerMidia.bind(null, id, m.id)}>
                      <button aria-label="Remover" className="rounded-full px-2 py-1 text-[#c4291c] hover:bg-creme-2">
                        Remover
                      </button>
                    </form>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
        <form action={enviarMidias.bind(null, id)} className="mt-5 flex flex-wrap items-center gap-3">
          <input type="file" name="arquivos" multiple accept="image/jpeg,image/png,image/webp,image/gif,video/mp4" className="text-sm" />
          <button className="btn btn-contorno">Enviar</button>
        </form>
      </section>

      <div className="mt-8">
        <ProductForm
          action={salvarProduto.bind(null, id)}
          defaults={productToDefaults(product, priv?.canva_master_design_id ?? null)}
          categories={categories ?? []}
          productTypes={PRODUCT_TYPES}
        />
      </div>

      <form action={criarCategoria} className="mt-8 flex flex-wrap items-end gap-3 rounded-[24px] bg-creme-2 p-5">
        <input type="hidden" name="voltar" value={`/admin/produtos/${id}`} />
        <label className="grid gap-1.5 text-sm font-medium">
          Nova categoria
          <input name="nome" className="campo" placeholder="Ex.: Posts para pets" />
        </label>
        <button className="btn btn-contorno">Criar categoria</button>
      </form>
    </>
  );
}
