"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Estúdio de stickers: frases → PNG com transparência real (canal alfa), alta
 * resolução, ZIP da coleção e PDF de pré-visualização. Tudo gerado no navegador.
 * Fontes do Google Fonts (licença OFL, permitem uso comercial).
 */
type Style = {
  nome: string;
  fonte: string;
  peso: number;
  italico?: boolean;
  caixa?: "alta" | "normal";
  cor: string;
  contorno: string;
  espContorno: number;
  sombra?: string;
  fundo?: string; // pílula atrás do texto
  rot?: number;
};

const STYLES: Style[] = [
  { nome: "Minimalista", fonte: "Inter", peso: 600, cor: "#1d1d1f", contorno: "#ffffff", espContorno: 18 },
  { nome: "Retrô", fonte: "Shrikhand", peso: 400, cor: "#e2572b", contorno: "#fff4dc", espContorno: 26, sombra: "#7a2e12", rot: -4 },
  { nome: "Y2K", fonte: "Rubik Glitch", peso: 400, caixa: "alta", cor: "#c86bff", contorno: "#ffffff", espContorno: 22, sombra: "#3b1a5a" },
  { nome: "Fofo", fonte: "Baloo 2", peso: 800, cor: "#ff7aa8", contorno: "#ffffff", espContorno: 30, sombra: "#c74f7c", rot: -3 },
  { nome: "Manuscrito", fonte: "Caveat", peso: 700, cor: "#2b2b2b", contorno: "#ffffff", espContorno: 20, rot: -6 },
  { nome: "Moderno", fonte: "Archivo Black", peso: 400, caixa: "alta", cor: "#ffffff", contorno: "#111111", espContorno: 0, fundo: "#111111" },
  { nome: "Editorial", fonte: "Playfair Display", peso: 700, italico: true, cor: "#1d1d1f", contorno: "#f6efe4", espContorno: 22 },
  { nome: "Divertido", fonte: "Bungee", peso: 400, caixa: "alta", cor: "#ffd23f", contorno: "#1d1d1f", espContorno: 20, sombra: "#1d1d1f", rot: 3 },
  { nome: "Delicado", fonte: "Dancing Script", peso: 700, cor: "#b77e8f", contorno: "#ffffff", espContorno: 22 },
  { nome: "Tipográfico", fonte: "Bebas Neue", peso: 400, caixa: "alta", cor: "#0071e3", contorno: "#ffffff", espContorno: 22 },
];

const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Inter:wght@600&family=Shrikhand&family=Rubik+Glitch&family=Baloo+2:wght@800&family=Caveat:wght@700&family=Archivo+Black&family=Playfair+Display:ital,wght@1,700&family=Bungee&family=Dancing+Script:wght@700&family=Bebas+Neue&display=block";

const SIZE = 1500; // px — alta resolução

function fontSpec(s: Style, px: number) {
  return `${s.italico ? "italic " : ""}${s.peso} ${px}px "${s.fonte}"`;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Desenha o sticker num canvas transparente e recorta a sobra. */
export function renderSticker(text: string, s: Style, cor?: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = SIZE;
  c.height = SIZE;
  const ctx = c.getContext("2d")!;
  const t = s.caixa === "alta" ? text.toUpperCase() : text;
  let px = 260;
  let lines: string[] = [];
  for (; px > 60; px -= 10) {
    ctx.font = fontSpec(s, px);
    lines = wrap(ctx, t, SIZE * 0.78);
    if (lines.length * px * 1.1 < SIZE * 0.7) break;
  }
  ctx.font = fontSpec(s, px);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.translate(SIZE / 2, SIZE / 2);
  if (s.rot) ctx.rotate((s.rot * Math.PI) / 180);
  const lh = px * 1.08;
  const y0 = -((lines.length - 1) * lh) / 2;

  if (s.fundo) {
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + px * 0.9;
    const h = lines.length * lh + px * 0.5;
    ctx.fillStyle = s.fundo;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, Math.min(h / 2, px * 0.6));
    ctx.fill();
  }
  lines.forEach((l, i) => {
    const y = y0 + i * lh;
    if (s.sombra) {
      ctx.fillStyle = s.sombra;
      ctx.strokeStyle = s.sombra;
      ctx.lineWidth = s.espContorno;
      if (s.espContorno) ctx.strokeText(l, px * 0.05, y + px * 0.07);
      ctx.fillText(l, px * 0.05, y + px * 0.07);
    }
    if (s.espContorno) {
      ctx.strokeStyle = s.contorno;
      ctx.lineWidth = s.espContorno;
      ctx.strokeText(l, 0, y);
    }
    ctx.fillStyle = cor ?? s.cor;
    ctx.fillText(l, 0, y);
  });
  return trim(c);
}

function trim(c: HTMLCanvasElement) {
  const ctx = c.getContext("2d")!;
  const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
  let top = height, left = width, right = 0, bottom = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (data[(y * width + x) * 4 + 3] > 0) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
  if (right < left) return c;
  const pad = 24;
  const out = document.createElement("canvas");
  out.width = right - left + 1 + pad * 2;
  out.height = bottom - top + 1 + pad * 2;
  out.getContext("2d")!.drawImage(c, left, top, right - left + 1, bottom - top + 1, pad, pad, right - left + 1, bottom - top + 1);
  return out;
}

/** Verificações automáticas: transparência real, cantos vazios, resolução mínima. */
export function checkSticker(c: HTMLCanvasElement) {
  const ctx = c.getContext("2d")!;
  const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
  const alphaAt = (x: number, y: number) => data[(y * width + x) * 4 + 3];
  const corners = [alphaAt(0, 0), alphaAt(width - 1, 0), alphaAt(0, height - 1), alphaAt(width - 1, height - 1)];
  let transparent = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] === 0) transparent++;
  const problems: string[] = [];
  if (corners.some((a) => a !== 0)) problems.push("cantos não transparentes");
  if (transparent / (width * height) < 0.05) problems.push("quase sem transparência");
  if (Math.max(width, height) < 600) problems.push("resolução baixa");
  return problems;
}

const slug = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "sticker";

export function StickerStudio() {
  const [texto, setTexto] = useState("Bom dia\nGratidão\nPartiu!\nNovidades\nFaça seu pedido\nJá estamos atendendo\nAmor em cada detalhe\nAproveite!\nPromoção\nDisponível");
  const [estilo, setEstilo] = useState(0);
  const [cor, setCor] = useState<string | null>(null);
  const [colecao, setColecao] = useState("Colecao");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [previews, setPreviews] = useState<{ text: string; url: string; problems: string[] }[]>([]);
  const frases = useMemo(() => texto.split("\n").map((t) => t.trim()).filter(Boolean).slice(0, 60), [texto]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONTS_URL;
    document.head.appendChild(link);
    link.onload = async () => {
      await Promise.all(STYLES.map((s) => document.fonts.load(fontSpec(s, 80)).catch(() => null)));
      setReady(true);
    };
    return () => link.remove();
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setPreviews(
        frases.map((t) => {
          const c = renderSticker(t, STYLES[estilo], cor ?? undefined);
          return { text: t, url: c.toDataURL("image/png"), problems: checkSticker(c) };
        }),
      );
    }, 150);
  }, [frases, estilo, cor, ready]);

  async function exportar() {
    setBusy(true);
    const [{ default: JSZip }, { jsPDF }] = await Promise.all([import("jszip"), import("jspdf")]);
    const zip = new JSZip();
    const folder = zip.folder(slug(colecao))!;
    const canvases = frases.map((t) => ({ t, c: renderSticker(t, STYLES[estilo], cor ?? undefined) }));
    for (const [i, { t, c }] of canvases.entries()) {
      const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), "image/png"));
      folder.file(`${String(i + 1).padStart(2, "0")}-${slug(t)}.png`, blob);
    }
    // PDF de pré-visualização (folha de contato) — fundo xadrez mostra a transparência
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    pdf.setFontSize(16);
    pdf.text(`${colecao} · ${STYLES[estilo].nome} · ${canvases.length} stickers`, 12, 14);
    const cols = 3, cell = 60, x0 = 12, y0 = 22;
    canvases.forEach(({ c }, i) => {
      const page = Math.floor(i / 12);
      const k = i % 12;
      if (k === 0 && page > 0) pdf.addPage();
      const x = x0 + (k % cols) * (cell + 3);
      const y = y0 + Math.floor(k / cols) * (cell + 8);
      // miniatura leve (JPEG) sobre fundo xadrez, para a prévia não ficar pesada
      const thumb = document.createElement("canvas");
      thumb.width = thumb.height = 480;
      const tc = thumb.getContext("2d")!;
      for (let a = 0; a < 24; a++) for (let b = 0; b < 24; b++) { tc.fillStyle = (a + b) % 2 ? "#e8e8ed" : "#ffffff"; tc.fillRect(a * 20, b * 20, 20, 20); }
      const r = Math.min(440 / c.width, 440 / c.height);
      tc.drawImage(c, (480 - c.width * r) / 2, (480 - c.height * r) / 2, c.width * r, c.height * r);
      pdf.addImage(thumb.toDataURL("image/jpeg", 0.85), "JPEG", x, y, cell, cell);
    });
    folder.file(`${slug(colecao)}-previa.pdf`, pdf.output("blob"));
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${slug(colecao)}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
    setBusy(false);
  }

  const withProblems = previews.filter((p) => p.problems.length);

  return (
    <div className="grid gap-6">
      <div className="painel grid gap-4 p-5 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium sm:row-span-3">
          Frases (uma por linha, até 60)
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={10} className="campo" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Nome da coleção
          <input value={colecao} onChange={(e) => setColecao(e.target.value)} className="campo" />
        </label>
        <div className="grid gap-1.5 text-sm font-medium">
          Estilo
          <div className="flex flex-wrap gap-1.5">
            {STYLES.map((s, i) => (
              <button key={s.nome} type="button" onClick={() => { setEstilo(i); setCor(null); }} className={`pilula px-3 py-1.5 text-sm ${i === estilo ? "bg-grafite text-white" : "bg-white"}`}>{s.nome}</button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-3 text-sm font-medium">
          Cor do texto
          <input type="color" value={cor ?? STYLES[estilo].cor} onChange={(e) => setCor(e.target.value)} className="h-9 w-12 rounded-lg border border-linha-forte" />
          {cor && <button type="button" onClick={() => setCor(null)} className="text-pink hover:underline">restaurar</button>}
        </label>
      </div>

      {!ready && <p className="text-bege">Carregando fontes…</p>}
      {withProblems.length > 0 && (
        <p className="rounded-xl bg-[#fff1f0] px-4 py-3 text-sm text-[#c4291c]">Verifique: {withProblems.map((p) => `“${p.text}” (${p.problems.join(", ")})`).join("; ")}</p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {previews.map((p) => (
          <div key={p.text} className="flex aspect-square items-center justify-center rounded-2xl p-3" style={{ backgroundImage: "repeating-conic-gradient(#e8e8ed 0% 25%, #fff 0% 50%)", backgroundSize: "20px 20px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={p.text} className="max-h-full max-w-full" />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={exportar} disabled={!ready || busy || !frases.length} className="btn btn-pink disabled:opacity-60">{busy ? "Gerando…" : `Baixar ZIP (${frases.length} PNG + PDF)`}</button>
        <p className="text-sm text-bege">PNG {SIZE}px com fundo transparente de verdade, sem marca-d’água. O xadrez é só a visualização.</p>
      </div>
    </div>
  );
}
