import "jsr:@supabase/functions-js/edge-runtime.d.ts"

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
    const { email, link, companyName, role } = await req.json()
    if (!email || !link) return json({ sent: false, error: "missing email or link" }, 400)

    const key = Deno.env.get("RESEND_API_KEY")
    // Email delivery is optional: the invite link works on its own. When no
    // provider key is configured we simply report the link back unsent.
    if (!key) return json({ sent: false, link, reason: "no_email_provider" })

    const roleLabel = role === "admin" ? "Administrador" : "Membro"
    const company = companyName || "wiqfy"
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: Deno.env.get("INVITE_FROM") ?? "wiqfy <onboarding@resend.dev>",
        to: [email],
        subject: `Você foi convidado para ${company}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2>Convite para ${company}</h2>
            <p>Você foi convidado para acessar a wiqfy como <b>${roleLabel}</b>.</p>
            <p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#4F46E5;color:#fff;border-radius:8px;text-decoration:none">Criar minha conta</a></p>
            <p style="color:#888;font-size:12px">Ou copie este link: ${link}</p>
          </div>`,
      }),
    })
    if (!res.ok) return json({ sent: false, link, error: await res.text() }, 502)
    return json({ sent: true, link })
  } catch (e) {
    return json({ sent: false, error: String(e) }, 400)
  }
})
