/** Aviso honesto exibido enquanto o banco não está conectado ou o catálogo está vazio. */
export function CatalogNotice({ configured }: { configured: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-paper p-8 text-center">
      <p className="font-display text-xl">
        {configured ? "Nenhum produto por aqui ainda" : "Catálogo em preparação"}
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
        {configured
          ? "Os produtos aparecem assim que forem publicados no painel."
          : "A loja ainda não está conectada ao banco de dados. Os produtos aparecem aqui depois da configuração."}
      </p>
    </div>
  );
}
