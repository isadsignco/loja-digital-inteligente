"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Recarrega o status do pedido a cada 4 s enquanto aguarda o pagamento. */
export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(t);
  }, [router]);
  return null;
}

export function CopyButton({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setOk(true);
        setTimeout(() => setOk(false), 2500);
      }}
      className="btn btn-pink w-full justify-center"
    >
      {ok ? "Código copiado" : "Copiar código Pix"}
    </button>
  );
}
