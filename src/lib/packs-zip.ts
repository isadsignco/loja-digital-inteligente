/**
 * Leitura do ZIP gerado pelo "Packs isadsign".
 *
 * Estrutura que o Packs grava:
 *   estaticos/estatico-01.png
 *   carrosseis/carrossel-01-slide-01.png
 *   stories/story-01.png
 *   capas-reels/capa-reels-01.png
 *   legendas.txt (opcional)
 *
 * Só lógica pura (sem rede e sem JSZip), para poder ser testada e usada no navegador.
 */

export type PackTipo = "estatico" | "carrossel" | "story" | "reels";

export type PackArte = { path: string; tipo: PackTipo; ordem: number; slide: number };

export type PackResumo = {
  artes: PackArte[];
  contagem: Record<PackTipo, number>; // peças (um carrossel conta uma vez)
  totalArquivos: number;
};

const PASTAS: Record<string, PackTipo> = {
  estaticos: "estatico",
  carrosseis: "carrossel",
  stories: "story",
  "capas-reels": "reels",
};

export const NOMES_TIPO: Record<PackTipo, [string, string]> = {
  estatico: ["post estático", "posts estáticos"],
  carrossel: ["carrossel", "carrosséis"],
  story: ["Story", "Stories"],
  reels: ["capa de Reels", "capas de Reels"],
};

/** Classifica um caminho do ZIP. Ignora o que não for PNG de uma das pastas do Packs. */
export function classificarArte(path: string): PackArte | null {
  const limpo = path.replace(/\\/g, "/").replace(/^\.?\//, "");
  if (limpo.startsWith("__MACOSX/")) return null;
  const partes = limpo.split("/");
  if (partes.length < 2) return null;
  const pasta = partes[partes.length - 2];
  const arquivo = partes[partes.length - 1];
  const tipo = PASTAS[pasta];
  if (!tipo || !/\.png$/i.test(arquivo)) return null;
  const nums = arquivo.match(/\d+/g)?.map(Number) ?? [];
  const ordem = nums[0] ?? 0;
  const slide = tipo === "carrossel" ? (nums[1] ?? 1) : 1;
  return { path: limpo, tipo, ordem, slide };
}

export function resumirPack(paths: string[]): PackResumo {
  const artes = paths
    .map(classificarArte)
    .filter((a): a is PackArte => a !== null)
    .sort((a, b) => ORDEM.indexOf(a.tipo) - ORDEM.indexOf(b.tipo) || a.ordem - b.ordem || a.slide - b.slide);
  const contagem: Record<PackTipo, number> = { estatico: 0, carrossel: 0, story: 0, reels: 0 };
  for (const a of artes) if (a.tipo !== "carrossel" || a.slide === 1) contagem[a.tipo]++;
  return { artes, contagem, totalArquivos: artes.length };
}

const ORDEM: PackTipo[] = ["estatico", "carrossel", "story", "reels"];

/**
 * Escolhe as artes da vitrine: a primeira de cada tipo (capa = primeiro estático,
 * ou o primeiro que existir) e completa com mais estáticos e capas de carrossel.
 */
export function escolherVitrine(resumo: PackResumo, maximo = 8): PackArte[] {
  const capas = resumo.artes.filter((a) => a.tipo !== "carrossel" || a.slide === 1);
  const escolhidas: PackArte[] = [];
  for (const tipo of ORDEM) {
    const primeira = capas.find((a) => a.tipo === tipo);
    if (primeira) escolhidas.push(primeira);
  }
  for (const a of capas) {
    if (escolhidas.length >= maximo) break;
    if (!escolhidas.includes(a)) escolhidas.push(a);
  }
  return escolhidas.slice(0, maximo);
}

/** "6 posts estáticos, 2 carrosséis e 6 Stories" */
export function descreverContagem(contagem: Record<PackTipo, number>): string {
  const partes = ORDEM.filter((t) => contagem[t] > 0).map((t) => `${contagem[t]} ${NOMES_TIPO[t][contagem[t] === 1 ? 0 : 1]}`);
  if (partes.length <= 1) return partes[0] ?? "nenhuma peça";
  return `${partes.slice(0, -1).join(", ")} e ${partes[partes.length - 1]}`;
}

/** Tipo de produto da loja a partir do que o pack tem. */
export function tipoDeProduto(contagem: Record<PackTipo, number>): "pack_posts" | "pack_stories" {
  const feed = contagem.estatico + contagem.carrossel;
  return feed === 0 && contagem.story + contagem.reels > 0 ? "pack_stories" : "pack_posts";
}

/** Nome do pack a partir do arquivo ("pack-confeitaria-novembro.zip" → "Pack confeitaria novembro"). */
export function nomeDoArquivo(nome: string): string {
  const base = nome.replace(/\.zip$/i, "").replace(/[-_]+/g, " ").trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : "Pack";
}
