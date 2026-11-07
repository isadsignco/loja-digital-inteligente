const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatPrice(cents: number) {
  return brl.format(cents / 100);
}

export function isPast(date: string | Date | null | undefined) {
  return date ? new Date(date).getTime() < Date.now() : false;
}
