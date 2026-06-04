import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/accept-invite?token=${token ?? ""}`)}`)
  }

  if (!token) {
    return <Message title="Convite inválido" body="Nenhum token de convite foi informado." />
  }

  // Already onboarded — nothing to accept.
  const { data: existing } = await supabase
    .from("profiles").select("id").eq("id", user!.id).maybeSingle()
  if (existing) redirect("/dashboard")

  const { error } = await supabase.rpc("accept_invite", { p_token: token })
  if (error) {
    return (
      <Message
        title="Não foi possível aceitar o convite"
        body={
          error.message.includes("mismatch")
            ? "Este convite foi enviado para outro e-mail. Entre com a conta correta."
            : error.message.includes("expired") || error.message.includes("invalid")
              ? "Convite expirado ou já utilizado. Peça um novo convite ao administrador."
              : error.message
        }
      />
    )
  }

  redirect("/dashboard")
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", background: "var(--bg-primary)" }}>
      <div style={{ maxWidth: "420px", textAlign: "center", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "14px", padding: "32px" }}>
        <h1 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>{title}</h1>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "20px" }}>{body}</p>
        <Link href="/login" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600, fontSize: "13px" }}>Ir para o login</Link>
      </div>
    </div>
  )
}
