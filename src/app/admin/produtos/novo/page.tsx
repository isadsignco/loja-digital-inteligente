import Link from "next/link";
import { Suspense } from "react";
import { PRODUCT_TYPES } from "@/server/admin/product-input";
import { requireAdmin } from "@/server/auth";
import { salvarProduto } from "../actions";
import { emptyProduct } from "../defaults";
import { ProductForm } from "../product-form";

export default function NewProductPage() {
  return (
    <>
      <Link href="/admin/produtos" className="text-sm text-pink hover:underline">
        ‹ Produtos
      </Link>
      <h1 className="titulo mt-2 text-[40px]">Novo produto</h1>
      <p className="mt-2 text-bege">Salve primeiro; depois você adiciona as fotos e mockups.</p>
      <div className="mt-8">
        <Suspense fallback={<p className="text-bege">Carregando…</p>}>
          <NewForm />
        </Suspense>
      </div>
    </>
  );
}

async function NewForm() {
  const { supabase } = await requireAdmin();
  const { data: categories } = await supabase.from("categories").select("id, name").order("position");
  return (
    <ProductForm
      action={salvarProduto.bind(null, null)}
      defaults={emptyProduct}
      categories={categories ?? []}
      productTypes={PRODUCT_TYPES}
    />
  );
}
