"use client";

import { useActionState } from "react";
import { criarRascunhoComIA, gerarConteudo, pesquisarOportunidades, type AiState } from "./actions";

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
