import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Callback do link enviado por e-mail (recuperação de senha, confirmação, etc.).
// Troca o `code` (PKCE) por uma sessão e redireciona para `next` — que é validado
// como caminho interno (mesma proteção anti open-redirect do login).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const nextParam = searchParams.get("next") ?? "/dashboard"
  const next =
    nextParam.startsWith("/") && !nextParam.startsWith("//") && !nextParam.startsWith("/\\")
      ? nextParam
      : "/dashboard"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }
  return NextResponse.redirect(`${origin}/login?error=link_invalido`)
}
