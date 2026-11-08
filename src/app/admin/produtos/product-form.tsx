"use client";

import { useActionState } from "react";
import type { ProductFormState } from "./actions";

export type ProductFormDefaults = {
  creative_name: string;
  commercial_name: string;
  slug: string;
  line: string;
  status: string;
  category_id: string;
  description: string;
  target_audience: string;
  ideal_for: string;
  benefits: string;
  differentials: string;
  price: string;
  promo_price: string;
  keywords: string;
  product_type: string;
  formats: string;
  file_count: string;
  canva_template_url: string;
  canva_master_link: string;
  usage_instructions: string;
  customizable: boolean;
  color_slots: string;
  featured: boolean;
  is_new: boolean;
  available: boolean;
  access_days: string;
  commercial_valid_until: string;
};

type Props = {
  action: (prev: ProductFormState, form: FormData) => Promise<ProductFormState>;
  defaults: ProductFormDefaults;
  categories: { id: string; name: string }[];
  productTypes: readonly (readonly [string, string])[];
};

export function ProductForm({ action, defaults: d, categories, productTypes }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const err = (campo: string) => (state.campo === campo ? state.erro : undefined);

  return (
    <form action={formAction} className="grid gap-8">
      <Section title="Informações comerciais">
        <Field label="Nome criativo" hint="Ex.: Coração Apertado" error={err("creative_name")}>
          <input name="creative_name" required defaultValue={d.creative_name} className="campo" />
        </Field>
        <Field label="Nome comercial" hint="O que aparece como título. Ex.: Pack Pet · 25 posts para clínicas" error={err("commercial_name")}>
          <input name="commercial_name" required defaultValue={d.commercial_name} className="campo" />
        </Field>
        <Field label="Descrição" wide>
          <textarea name="description" rows={5} defaultValue={d.description} className="campo" />
        </Field>
        <Field label="Público-alvo">
          <input name="target_audience" defaultValue={d.target_audience} className="campo" />
        </Field>
        <Field label="Ideal para">
          <input name="ideal_for" defaultValue={d.ideal_for} className="campo" />
        </Field>
        <Field label="Benefícios" hint="Um por linha">
          <textarea name="benefits" rows={4} defaultValue={d.benefits} className="campo" />
        </Field>
        <Field label="Diferenciais" hint="Um por linha">
          <textarea name="differentials" rows={4} defaultValue={d.differentials} className="campo" />
        </Field>
        <Field label="Preço (R$)" hint="Ex.: 27,90" error={err("price")}>
          <input name="price" inputMode="decimal" required defaultValue={d.price} className="campo" />
        </Field>
        <Field label="Preço promocional (R$)" hint="Opcional" error={err("promo_price")}>
          <input name="promo_price" inputMode="decimal" defaultValue={d.promo_price} className="campo" />
        </Field>
        <Field label="Palavras-chave" hint="Separadas por vírgula. Usadas na busca e no Pinterest." wide>
          <input name="keywords" defaultValue={d.keywords} className="campo" />
        </Field>
      </Section>

      <Section title="Organização">
        <Field label="Linha">
          <select name="line" defaultValue={d.line} className="campo">
            <option value="original">Original</option>
            <option value="ai_design">AI Design</option>
            <option value="personalizado">Personalizado</option>
          </select>
        </Field>
        <Field label="Tipo de produto">
          <select name="product_type" defaultValue={d.product_type} className="campo">
            {productTypes.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Categoria">
          <select name="category_id" defaultValue={d.category_id} className="campo">
            <option value="">Sem categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Endereço na loja (slug)" hint="Em branco: gerado pelo nome comercial" error={err("slug")}>
          <input name="slug" defaultValue={d.slug} className="campo" />
        </Field>
      </Section>

      <Section title="Arquivos e entrega">
        <Field label="Link de template do Canva (o que o cliente recebe)" hint="Canva → Compartilhar → Link de template" error={err("canva_template_url")} wide>
          <input name="canva_template_url" type="url" defaultValue={d.canva_template_url} className="campo" placeholder="https://www.canva.com/design/..." />
        </Field>
        <Field
          label="Link do design original (só para a personalização)"
          hint="Nunca aparece para o cliente. O agente copia este design e troca as cores."
          error={err("canva_master_link")}
          wide
        >
          <input name="canva_master_link" defaultValue={d.canva_master_link} className="campo" placeholder="https://www.canva.com/design/..." />
        </Field>
        <Field label="Formatos" hint="Separados por vírgula. Ex.: PNG, PDF, Canva">
          <input name="formats" defaultValue={d.formats} className="campo" />
        </Field>
        <Field label="Quantidade de artes" error={err("file_count")}>
          <input name="file_count" inputMode="numeric" defaultValue={d.file_count} className="campo" />
        </Field>
        <Field label="Instruções de uso" wide>
          <textarea name="usage_instructions" rows={3} defaultValue={d.usage_instructions} className="campo" />
        </Field>
      </Section>

      <Section title="Disponibilidade">
        <Field label="Status">
          <select name="status" defaultValue={d.status} className="campo">
            <option value="rascunho">Rascunho</option>
            <option value="aguardando_aprovacao">Aguardando aprovação</option>
            <option value="ativo">Ativo (publicado na loja)</option>
            <option value="inativo">Inativo</option>
            <option value="arquivado">Arquivado</option>
          </select>
        </Field>
        <Field label="Prazo de acesso (dias)" hint="Em branco: sem prazo" error={err("access_days")}>
          <input name="access_days" inputMode="numeric" defaultValue={d.access_days} className="campo" />
        </Field>
        <Field label="Validade comercial" hint="Opcional, para produtos sazonais">
          <input name="commercial_valid_until" type="date" defaultValue={d.commercial_valid_until} className="campo" />
        </Field>
        <div className="grid gap-2 sm:col-span-2">
          <Check name="customizable" label="Permite personalização de cores" defaultChecked={d.customizable} />
          <Field label="Cores que o cliente pode trocar" hint="Uma por linha, com a cor original do design. Ex.: Cor principal #b793d6" error={err("color_slots")} wide>
            <textarea name="color_slots" rows={3} defaultValue={d.color_slots} className="campo font-mono text-sm" placeholder={"Cor principal #b793d6\nCor de destaque #4b0f35"} />
          </Field>
          <Check name="featured" label="Destaque na página inicial" defaultChecked={d.featured} />
          <Check name="is_new" label="Marcar como lançamento" defaultChecked={d.is_new} />
          <Check name="available" label="Disponível para venda" defaultChecked={d.available} />
        </div>
      </Section>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-2xl bg-white/90 p-3 shadow-[0_4px_24px_rgba(0,0,0,0.08)] backdrop-blur">
        <button disabled={pending} className="btn btn-pink disabled:opacity-60">
          {pending ? "Salvando…" : "Salvar produto"}
        </button>
        {state.erro && (
          <p role="alert" className="text-sm text-[#c4291c]">
            {state.erro}
          </p>
        )}
        {state.ok && <p className="text-sm text-lima">Salvo.</p>}
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-[24px] bg-creme-2 p-5 sm:p-7">
      <legend className="sr-only">{title}</legend>
      <h2 className="titulo mb-5 text-[24px]">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Field({ label, hint, error, wide, children }: { label: string; hint?: string; error?: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={`grid content-start gap-1.5 text-sm font-medium ${wide ? "sm:col-span-2" : ""}`}>
      {label}
      {children}
      {hint && !error && <span className="text-xs font-normal text-bege">{hint}</span>}
      {error && <span className="text-xs font-normal text-[#c4291c]">{error}</span>}
    </label>
  );
}

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center gap-3 text-[15px]">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-5 w-5 accent-[#b8136f]" />
      {label}
    </label>
  );
}
