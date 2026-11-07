import type { Metadata } from "next";
import { NewPasswordForm } from "@/app/conta/email-forms";

export const metadata: Metadata = { title: "Nova senha", robots: { index: false } };

export default function NewPasswordPage() {
  return (
    <div className="mx-auto max-w-[400px] px-5 py-20 text-center">
      <h1 className="titulo text-[36px]">Nova senha</h1>
      <NewPasswordForm />
    </div>
  );
}
