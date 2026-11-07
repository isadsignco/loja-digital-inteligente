import { NextResponse, type NextRequest } from "next/server";
import { tryAdminSupabase } from "@/lib/supabase-admin";

/** Link rastreável: registra o clique, guarda a origem por 30 dias e redireciona. */
export async function GET(req: NextRequest, ctx: RouteContext<"/r/[code]">) {
  const { code } = await ctx.params;
  if (!/^[a-z0-9-]{3,40}$/i.test(code)) return NextResponse.redirect(new URL("/", req.url));
  const db = tryAdminSupabase();
  if (!db) return NextResponse.redirect(new URL("/", req.url));
  const { data: link } = await db
    .from("tracking_links")
    .select("id, target_path, utm_source, utm_medium, utm_campaign, utm_content")
    .eq("code", code)
    .maybeSingle();
  if (!link) return NextResponse.redirect(new URL("/", req.url));
  await db.from("link_clicks").insert({ tracking_link_id: link.id });

  const target = link.target_path.startsWith("/") ? link.target_path : "/";
  const res = NextResponse.redirect(new URL(target, req.url));
  res.cookies.set(
    "origem",
    JSON.stringify({
      t: link.id,
      utm: { utm_source: link.utm_source, utm_medium: link.utm_medium, utm_campaign: link.utm_campaign, utm_content: link.utm_content },
    }),
    { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24 * 30 },
  );
  return res;
}
