import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

export default function LoginPage({ searchParams }: PageProps<"/entrar">) {
  return (
    <div className="mx-auto max-w-[400px] px-5 py-20 text-center">
      <h1 className="titulo text-[40px]">Entrar</h1>
      <p className="mt-2 text-[17px] text-bege">Acesso ao painel da loja.</p>
      <Suspense fallback={null}>
        <LoginArea searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function LoginArea({ searchParams }: { searchParams: PageProps<"/entrar">["searchParams"] }) {
  const sp = await searchParams;
  const voltar = typeof sp.voltar === "string" ? sp.voltar : undefined;
  const semPermissao = sp.erro === "sem-permissao";
  return (
    <>
      {semPermissao && (
        <p className="mt-6 rounded-xl bg-creme-2 px-4 py-3 text-sm">
          Esta conta não tem acesso ao painel administrativo.
        </p>
      )}
      <LoginForm voltar={voltar} />
    </>
  );
}
