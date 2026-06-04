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
    if (chkErr) return json({ created: false, error: chkErr.message }, 400)
    if (isAdmin !== true) return json({ created: false, error: "forbidden" }, 403)

    const { email, password, name, company_id, role } = await req.json()
    if (!email || !password) return json({ created: false, error: "email e senha são obrigatórios" }, 400)
    const finalRole = role === "admin" || role === "super_admin" || role === "member" ? role : "member"

    // Passo 2 — criar o usuário com service_role (Admin API).
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: name ?? "" },
    })
    if (createErr || !created?.user) {
      return json({ created: false, error: createErr?.message ?? "falha ao criar usuário" }, 400)
    }
    const userId = created.user.id

    // Passo 3 — criar o profile vinculado (ou sem empresa).
    const { error: profErr } = await admin.from("profiles").insert({
      id: userId,
      company_id: company_id ?? null,
      name: name ?? "",
      role: finalRole,
    })
    if (profErr) {
      // rollback: remove o auth user para não deixar órfão.
      await admin.auth.admin.deleteUser(userId)
      return json({ created: false, error: profErr.message }, 400)
    }

    // Passo 4 — registrar a participação na empresa (fonte de verdade do
    // multi-empresa). Sem company_id, o usuário fica sem participação ativa.
    if (company_id) {
      const { error: memberErr } = await admin.from("company_members").insert({
        company_id,
        user_id: userId,
        role: finalRole,
      })
      if (memberErr) {
        // rollback: remove profile + auth user para não deixar estado parcial.
        await admin.from("profiles").delete().eq("id", userId)
        await admin.auth.admin.deleteUser(userId)
        return json({ created: false, error: memberErr.message }, 400)
      }
    }

    return json({ created: true, user_id: userId })
  } catch (e) {
    return json({ created: false, error: String(e) }, 400)
  }
})
