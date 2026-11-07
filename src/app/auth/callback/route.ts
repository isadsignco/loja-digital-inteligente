import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";

/** Retorno dos links enviados por e-mail (login do cliente e redefinição de senha). */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next = req.nextUrl.searchParams.get("next") ?? "/conta";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/conta";
  if (code) {
    const supabase = await getServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, req.url));
  }
  return NextResponse.redirect(new URL("/conta?erro=link", req.url));
}
