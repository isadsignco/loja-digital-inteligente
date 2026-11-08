"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { escolherVitrine, NOMES_TIPO, nomeDoArquivo, resumirPack, descreverContagem } from "@/lib/packs-zip";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { slugify } from "@/server/admin/product-input";
import { criarRascunhoComIA, gerarConteudo, importarPackDoPacks, pesquisarOportunidades, type AiState } from "./actions";

function Err({ s }: { s: AiState }) {
  return s.erro ? <p role="alert" className="rounded-xl bg-[#fff1f0] px-4 py-3 text-sm text-[#c4291c]">{s.erro}</p> : null;
}

export function ProductAiForm() {
  const [s, run, pending] = useActionState<AiState, FormData>(criarRascunhoComIA, {});
  return (
    <form action={run} className="grid gap-3">
      <textarea name="descricao" rows={4} placeholder="Ex.: pack com 25 posts para clínicas veterinárias, tons lilás e vinho, temas: bastidores, cuidados, datas comemorativas…" className="campo" />
      <label className="text-sm">Imagem do produto (opcional) <input type="file" name="imagem" accept="image/jpeg,image/png,image/webp,image/gif" className="mt-1 block text-sm" /></label>
      <Err s={s} />
      <button disabled={pending} className="btn btn-pink w-fit disabled:opacity-60">{pending ? "Criando rascunho…" : "Criar rascunho com IA"}</button>
      <p className="text-xs text-bege">O produto fica como “Aguardando aprovação”. Você revisa, ajusta, coloca o link do Canva e publica.</p>
    </form>
  );
}

type Content = { titulo: string; itens: { texto: string; uso: string }[]; revisao: string };

export function ContentForm() {
  const [s, run, pending] = useActionState<AiState, FormData>(gerarConteudo, {});
  const r = s.resultado as Content | undefined;
  const txt = r ? `${r.titulo}\n\n${r.itens.map((i, n) => `${n + 1}. ${i.texto}\n   (${i.uso})`).join("\n\n")}` : "";
  return (
    <>
      <form action={run} className="grid gap-3 sm:grid-cols-2">
        <select name="tipo" className="campo">
          {["frases para Instagram", "frases para Stories", "legendas", "chamadas para ação", "textos comerciais", "ideias de publicações", "calendário editorial do mês", "carrossel educativo (slides)", "roteiros de Reels/TikTok", "conteúdo institucional", "frases para stickers"].map((t) => <option key={t}>{t}</option>)}
        </select>
        <input name="segmento" placeholder="Segmento (ex.: doceria)" className="campo" />
        <input name="quantidade" type="number" min={1} max={60} defaultValue={20} className="campo" aria-label="Quantidade" />
        <input name="tom" placeholder="Tom (ex.: divertido, elegante)" className="campo" />
        <input name="objetivo" placeholder="Objetivo (ex.: vender, engajar)" className="campo" />
        <input name="estilo" placeholder="Estilo de escrita" className="campo" />
        <input name="publico" placeholder="Público-alvo" className="campo sm:col-span-2" />
        <div className="sm:col-span-2"><Err s={s} /></div>
        <button disabled={pending} className="btn btn-pink w-fit disabled:opacity-60">{pending ? "Gerando e revisando…" : "Gerar conteúdo"}</button>
      </form>
      {r && (
        <div className="mt-5 rounded-2xl bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">{r.titulo}</p>
            <a download={`${r.titulo}.txt`} href={`data:text/plain;charset=utf-8,${encodeURIComponent(txt)}`} className="text-sm text-pink hover:underline">Baixar TXT</a>
          </div>
          <p className="mt-1 text-xs text-bege">Revisão: {r.revisao}</p>
          <ol className="mt-3 grid list-decimal gap-2 pl-5 text-[15px]">{r.itens.map((i, n) => <li key={n}>{i.texto} <span className="text-xs text-bege">· {i.uso}</span></li>)}</ol>
        </div>
      )}
    </>
  );
}

export function ResearchForm() {
  const [s, run, pending] = useActionState<AiState, FormData>(pesquisarOportunidades, {});
  const r = s.resultado as { text: string; sources: { url: string; title: string }[] } | undefined;
  return (
    <>
      <form action={run} className="flex flex-wrap gap-2">
        <input name="foco" placeholder="Foco (ex.: Natal, estética, docerias)" className="campo flex-1" />
        <button disabled={pending} className="btn btn-pink disabled:opacity-60">{pending ? "Pesquisando…" : "Pesquisar"}</button>
      </form>
      <div className="mt-3"><Err s={s} /></div>
      {r && (
        <div className="mt-4 rounded-2xl bg-white p-5 text-[15px]">
          <p className="whitespace-pre-line">{r.text}</p>
          {r.sources.length > 0 && (
            <ul className="mt-4 grid gap-1 text-xs">{r.sources.slice(0, 12).map((x) => <li key={x.url}><a href={x.url} target="_blank" rel="noopener" className="text-pink hover:underline">{x.title || x.url}</a></li>)}</ul>
          )}
        </div>
      )}
    </>
  );
}

const LIMITE_ZIP = 50 * 1024 * 1024; // limite por arquivo do Supabase gratuito

/**
 * Importa o ZIP baixado no "Packs isadsign". Tudo que é pesado acontece no navegador:
 * abrir o ZIP, subir as artes da vitrine e guardar o ZIP no armazenamento privado.
 * O servidor só cria o rascunho (aguardando aprovação) com a ajuda da IA.
 */
export function PacksImportForm() {
  const router = useRouter();
  const [estado, setEstado] = useState<{ etapa?: string; erro?: string; aviso?: string; id?: string }>({});
  const [ocupado, setOcupado] = useState(false);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = new FormData(e.currentTarget).get("pack");
    if (!(file instanceof File) || !file.size) return setEstado({ erro: "Escolha o ZIP baixado no Packs isadsign." });
    if (!/\.zip$/i.test(file.name)) return setEstado({ erro: "O arquivo precisa ser o .zip que o Packs isadsign baixa." });
    if (file.size > LIMITE_ZIP) return setEstado({ erro: "O ZIP passa de 50 MB, o limite por arquivo do Supabase gratuito. Gere o pack em duas partes." });

    setOcupado(true);
    const enviados: { bucket: "vitrine" | "arquivos"; path: string }[] = [];
    let db: ReturnType<typeof getBrowserSupabase> | null = null;
    try {
      db = getBrowserSupabase();
      setEstado({ etapa: "Abrindo o ZIP…" });
      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(file);
      const nomes = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
      const resumo = resumirPack(nomes);
      if (!resumo.totalArquivos) throw new Error("Esse ZIP não tem as pastas do Packs (estaticos, carrosseis, stories, capas-reels).");

      const arqLegendas = nomes.find((n) => /(^|\/)legendas\.txt$/i.test(n));
      const legendas = arqLegendas ? (await zip.file(arqLegendas)!.async("string")).slice(0, 6000) : "";

      const lote = crypto.randomUUID();
      const vitrine = escolherVitrine(resumo);
      const imagens: { path: string; alt: string }[] = [];
      for (const [i, arte] of vitrine.entries()) {
        setEstado({ etapa: `Subindo as artes da vitrine… ${i + 1} de ${vitrine.length}` });
        const blob = await zip.file(arte.path)!.async("blob");
        const path = `importacoes/${lote}/${String(i + 1).padStart(2, "0")}-${slugify(arte.path.split("/").pop()!.replace(/\.png$/i, ""))}.png`;
        const up = await db.storage.from("vitrine").upload(path, blob, { contentType: "image/png", upsert: false });
        if (up.error) throw new Error(`Não deu para subir ${arte.path}: ${up.error.message}`);
        enviados.push({ bucket: "vitrine", path });
        imagens.push({ path, alt: `${NOMES_TIPO[arte.tipo][0]} ${arte.ordem} do pack` });
      }

      setEstado({ etapa: "Guardando o ZIP no armazenamento privado…" });
      const zipPath = `packs/${lote}/${slugify(file.name.replace(/\.zip$/i, "")) || "pack"}.zip`;
      const upZip = await db.storage.from("arquivos").upload(zipPath, file, { contentType: "application/zip", upsert: false });
      if (upZip.error) throw new Error(`Não deu para guardar o ZIP: ${upZip.error.message}`);
      enviados.push({ bucket: "arquivos", path: zipPath });

      setEstado({ etapa: `Criando o rascunho (${descreverContagem(resumo.contagem)})…` });
      const r = await importarPackDoPacks({
        nome: nomeDoArquivo(file.name),
        arquivoZip: zipPath,
        tamanhoZip: file.size,
        contagem: resumo.contagem,
        totalArquivos: resumo.totalArquivos,
        legendas,
        vitrine: imagens,
      });
      if (r.erro || !r.id) throw new Error(r.erro ?? "O rascunho não foi criado.");
      if (r.aviso) {
        setEstado({ aviso: r.aviso, id: r.id });
        setOcupado(false);
        return;
      }
      router.push(`/admin/produtos/${r.id}?ia=1`);
    } catch (err) {
      // desfaz o que já tinha subido, para não sobrar arquivo solto
      if (db) {
        for (const bucket of ["vitrine", "arquivos"] as const) {
          const paths = enviados.filter((x) => x.bucket === bucket).map((x) => x.path);
          if (paths.length) await db.storage.from(bucket).remove(paths);
        }
      }
      setEstado({ erro: err instanceof Error ? err.message : "Não deu para importar o pack." });
      setOcupado(false);
    }
  }

  return (
    <form onSubmit={enviar} className="grid gap-3">
      <label className="grid gap-1.5 text-sm font-semibold">
        ZIP baixado no Packs isadsign
        <input type="file" name="pack" accept=".zip,application/zip" disabled={ocupado} className="block text-sm font-normal" />
      </label>
      {estado.erro && <p role="alert" className="rounded-xl bg-[#fff1f0] px-4 py-3 text-sm text-[#c4291c]">{estado.erro}</p>}
      {estado.etapa && ocupado && <p role="status" className="text-sm font-semibold text-bege">{estado.etapa}</p>}
      {estado.aviso && estado.id && (
        <p role="status" className="rounded-xl bg-[#fff6e5] px-4 py-3 text-sm text-[#7a4a00]">
          {estado.aviso}{" "}
          <Link href={`/admin/produtos/${estado.id}?ia=1`} className="font-bold underline">Abrir o rascunho</Link>
        </p>
      )}
      <button disabled={ocupado} className="btn btn-pink w-fit disabled:opacity-60">{ocupado ? "Importando…" : "Importar pack"}</button>
      <p className="text-xs text-bege">
        No Packs, gere o pack e toque em “Baixar pack (ZIP)”. Aqui ele vira um produto “Aguardando aprovação”: algumas artes vão para a vitrine, o ZIP fica guardado
        para a entrega e a IA escreve o cadastro. Você revisa o preço e publica.
      </p>
    </form>
  );
}
