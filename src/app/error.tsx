"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-5 py-24 text-center">
      <p className="titulo text-[40px]">Algo deu errado.</p>
      <p className="mt-3 text-[17px] text-bege">Não conseguimos carregar esta página agora. Tente de novo em instantes.</p>
      <button onClick={reset} className="btn btn-pink mt-6">
        Tentar novamente
      </button>
    </div>
  );
}
