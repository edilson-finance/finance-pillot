import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { MODULES } from "@/lib/modules"

const MODULE_KEYS = new Set(MODULES.map((m) => m.key))

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(toSet) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname
  const isAuthRoute = path.startsWith("/login") || path.startsWith("/signup")
  if (!user && !isAuthRoute) {
    return NextResponse.redirect(new URL("/login", request.url))
  }
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // Module gating for members: RLS scopes data by company, so we enforce
  // per-module visibility here (admins/super_admins always pass).
  if (user) {
    const seg = path.split("/")[1]
    if (MODULE_KEYS.has(seg)) {
      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", user.id).maybeSingle()
      if (profile?.role === "member") {
        const { data: perms } = await supabase
          .from("member_permissions").select("module").eq("user_id", user.id).eq("allowed", true)
        const allowed = (perms ?? []).map((p) => p.module as string)
        if (!allowed.includes(seg)) {
          const target = allowed[0] ? `/${allowed[0]}` : "/no-access"
          return NextResponse.redirect(new URL(target, request.url))
        }
      }
    }
  }

  return response
}
