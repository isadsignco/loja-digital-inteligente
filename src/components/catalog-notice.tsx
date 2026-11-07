/** Aviso honesto exibido enquanto o banco não está conectado ou o catálogo está vazio. */
export function CatalogNotice({ configured }: { configured: boolean }) {
  return (
    <div className="painel p-10 text-center">
      <p className="titulo text-[28px] sm:text-[32px]">
        {configured ? "Nenhum produto por aqui ainda" : "Catálogo em preparação"}
      </p>
      <p className="mx-auto mt-2 max-w-md text-[17px] text-bege">
        {configured
          ? "Os produtos aparecem assim que forem publicados no painel."
          : "A loja ainda não está conectada ao banco de dados. Os produtos aparecem aqui depois da configuração."}
      </p>
    </div>
  );
}
