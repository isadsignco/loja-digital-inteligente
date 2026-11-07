"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { formDataToProductInput, productFormSchema, slugify } from "@/server/admin/product-input";
import { requireAdmin } from "@/server/auth";

export type ProductFormState = { erro?: string; campo?: string; ok?: boolean };

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
};

export async function salvarProduto(
  productId: string | null,
  _prev: ProductFormState,
  form: FormData,
): Promise<ProductFormState> {
  const { supabase, user } = await requireAdmin();
  const parsed = productFormSchema.safeParse(formDataToProductInput(form));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { erro: issue.message, campo: String(issue.path[0] ?? "") };
  }
  const { product, canvaMasterDesignId } = parsed.data;

  // dados de publicação/aprovação
  let current: { status: string; origin: string; published_at: string | null } | null = null;
  if (productId) {
    const { data } = await supabase.from("products").select("status, origin, published_at").eq("id", productId).single();
    current = data;
  }
  const extra: Record<string, unknown> = {};
  if (product.status === "ativo" && !current?.published_at) extra.published_at = new Date().toISOString();
  if (product.status === "ativo" && current?.origin === "ia" && current.status !== "ativo") {
    extra.approved_by = user.id;
    extra.approved_at = new Date().toISOString();
  }

  const row = { ...product, ...extra };
  const result = productId
    ? await supabase.from("products").update(row).eq("id", productId).select("id").single()
    : await supabase.from("products").insert({ ...row, origin: "manual" }).select("id").single();

  if (result.error) {
    if (result.error.code === "23505") return { erro: "Já existe um produto com este endereço (slug).", campo: "slug" };
    return { erro: `Não foi possível salvar: ${result.error.message}` };
  }
  const id = result.data.id as string;

  const priv = await supabase
    .from("product_private")
    .upsert({ product_id: id, canva_master_design_id: canvaMasterDesignId }, { onConflict: "product_id" });
  if (priv.error) return { erro: `Produto salvo, mas o link do design original falhou: ${priv.error.message}` };

  await supabase.from("audit_logs").insert({
    actor: user.id,
    action: productId ? "produto.editado" : "produto.criado",
    entity: "products",
    entity_id: id,
    details: { status: product.status },
  });

  updateTag("catalogo");
  if (!productId) redirect(`/admin/produtos/${id}?salvo=1`);
  return { ok: true };
}

export async function enviarMidias(productId: string, form: FormData) {
  const { supabase } = await requireAdmin();
  const files = form.getAll("arquivos").filter((f): f is File => f instanceof File && f.size > 0);

  const { data: last } = await supabase
    .from("product_media")
    .select("position")
    .eq("product_id", productId)
    .order("position", { ascending: false })
    .limit(1);
  let position = (last?.[0]?.position ?? -1) + 1;

  for (const file of files) {
    const ext = IMAGE_TYPES[file.type];
    if (!ext || file.size > MAX_IMAGE_BYTES) continue; // ignorado: tipo ou tamanho não suportado
    const path = `${productId}/${crypto.randomUUID()}.${ext}`;
    const up = await supabase.storage.from("vitrine").upload(path, file, { contentType: file.type, upsert: false });
    if (up.error) throw new Error(`Falha no envio de ${file.name}: ${up.error.message}`);
    const alt = slugify(file.name.replace(/\.[^.]+$/, "")).replace(/-/g, " ");
    const ins = await supabase.from("product_media").insert({
      product_id: productId,
      storage_path: path,
      kind: file.type.startsWith("video/") ? "video" : "imagem",
      alt,
      position: position++,
    });
    if (ins.error) throw new Error(`Falha ao registrar ${file.name}: ${ins.error.message}`);
  }
  updateTag("catalogo");
  redirect(`/admin/produtos/${productId}#midias`);
}

export async function moverMidia(productId: string, mediaId: string, direcao: "cima" | "baixo") {
  const { supabase } = await requireAdmin();
  const { data: items, error } = await supabase
    .from("product_media")
    .select("id, position")
    .eq("product_id", productId)
    .order("position");
  if (error || !items) throw new Error("Falha ao carregar as imagens.");
  const i = items.findIndex((m) => m.id === mediaId);
  const j = direcao === "cima" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= items.length) return;
  [items[i], items[j]] = [items[j], items[i]];
  for (const [pos, m] of items.entries()) {
    await supabase.from("product_media").update({ position: pos }).eq("id", m.id);
  }
  updateTag("catalogo");
  redirect(`/admin/produtos/${productId}#midias`);
}

export async function removerMidia(productId: string, mediaId: string) {
  const { supabase } = await requireAdmin();
  const { data: m } = await supabase.from("product_media").select("storage_path").eq("id", mediaId).single();
  if (m) {
    await supabase.storage.from("vitrine").remove([m.storage_path]);
    await supabase.from("product_media").delete().eq("id", mediaId);
  }
  updateTag("catalogo");
  redirect(`/admin/produtos/${productId}#midias`);
}

export async function criarCategoria(form: FormData) {
  const { supabase } = await requireAdmin();
  const name = String(form.get("nome") ?? "").trim();
  if (name.length < 2) return;
  await supabase.from("categories").insert({ name, slug: slugify(name) });
  updateTag("catalogo");
  redirect(String(form.get("voltar") ?? "/admin/produtos"));
}
