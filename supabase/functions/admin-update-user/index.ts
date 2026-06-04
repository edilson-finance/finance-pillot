import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  try {
    const url = Deno.env.get("SUPABASE_URL")!
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
    const authHeader = req.headers.get("Authorization") ?? ""

    // Passo 1 — validar que o chamador é super admin (client com o JWT do chamador).
    const caller = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: isAdmin, error: chkErr } = await caller.rpc("is_super_admin")
    if (chkErr) return json({ updated: false, error: chkErr.message }, 400)
    if (isAdmin !== true) return json({ updated: false, error: "forbidden" }, 403)

    const { user_id, email, password, name } = await req.json()
    if (!user_id) return json({ updated: false, error: "user_id é obrigatório" }, 400)

    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

    // Passo 2 — atualizar credenciais via Admin API (só os campos enviados).
    const attrs: Record<string, unknown> = {}
    if (typeof email === "string" && email.trim()) {
      attrs.email = email.trim().toLowerCase()
      attrs.email_confirm = true // super admin define direto, sem reconfirmação.
    }
    if (typeof password === "string" && password.length > 0) {
      if (password.length < 6) return json({ updated: false, error: "senha deve ter ao menos 6 caracteres" }, 400)
      attrs.password = password
    }
    if (typeof name === "string") {
      attrs.user_metadata = { name: name.trim() }
    }

    if (Object.keys(attrs).length > 0) {
      const { error: updErr } = await admin.auth.admin.updateUserById(user_id, attrs)
      if (updErr) return json({ updated: false, error: updErr.message }, 400)
    }

    // Passo 3 — espelhar o nome no profile (fonte usada nas listagens do app).
    if (typeof name === "string") {
      const { error: profErr } = await admin.from("profiles")
        .update({ name: name.trim() }).eq("id", user_id)
      if (profErr) return json({ updated: false, error: profErr.message }, 400)
    }

    return json({ updated: true })
  } catch (e) {
    return json({ updated: false, error: String(e) }, 400)
  }
})
