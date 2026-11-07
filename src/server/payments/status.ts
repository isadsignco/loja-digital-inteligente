/** Status de pagamento do Mercado Pago → status do pedido na loja. */
export function orderStatusFromPayment(paymentStatus: string, previous: string): string {
  if (paymentStatus === "approved") return previous === "reembolsado" ? previous : "pago";
  if (paymentStatus === "refunded" || paymentStatus === "charged_back") return "reembolsado";
  // pendente, em análise, recusado ou cancelado: o pedido continua como está
  // (um cartão recusado não cancela o pedido; o cliente pode tentar de novo)
  return previous;
}

export function isApproved(status: string) {
  return status === "approved";
}
