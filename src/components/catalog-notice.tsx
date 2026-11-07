/** Aviso honesto exibido enquanto o banco não está conectado ou o catálogo está vazio. */
export function CatalogNotice({ configured }: { configured: boolean }) {
  return (
    <div className="painel border-dashed bg-creme-2 p-8 text-center">
      <p className="titulo text-3xl sm:text-4xl">
        {configured ? "Nenhum produto por aqui ainda" : "Catálogo em preparação"}
      </p>
      <p className="mx-auto mt-2 max-w-md text-bege">
        {configured
          ? "Os produtos aparecem assim que forem publicados no painel."
          : "A loja ainda não está conectada ao banco de dados. Os produtos aparecem aqui depois da configuração."}
      </p>
    </div>
  );
}
