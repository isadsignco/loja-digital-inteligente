/** Preenche os marcadores {{nome}} dos modelos de mensagem. Marcador desconhecido vira vazio. */
export function renderTemplate(text: string, vars: Record<string, string | number | null | undefined>) {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, k: string) => {
    const v = vars[k];
    return v === null || v === undefined ? "" : String(v);
  });
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Texto simples → HTML de e-mail (links clicáveis, quebras de linha). */
export function textToEmailHtml(text: string) {
  const body = escapeHtml(text)
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#b8136f">$1</a>')
    .replace(/\n/g, "<br>");
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;font-size:16px;line-height:1.55;color:#1d1d1f;max-width:560px">${body}</div>`;
}
