import type { Metadata } from "next";
import { ResetPasswordForm } from "@/app/conta/email-forms";

export const metadata: Metadata = { title: "Esqueci minha senha", robots: { index: false } };

export default function ForgotPage() {
  return (
    <div className="mx-auto max-w-[400px] px-5 py-20 text-center">
      <h1 className="titulo text-[36px]">Esqueci minha senha</h1>
      <p className="mt-2 text-bege">Enviamos um link para você criar uma senha nova.</p>
      <ResetPasswordForm />
    </div>
  );
}
