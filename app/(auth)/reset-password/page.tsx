"use client"

import Link from "next/link"
import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 38px 9px 12px",
  background: "var(--bg-tertiary)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  fontSize: "13px",
  color: "var(--text-primary)",
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [status, setStatus] = useState<"checking" | "ready" | "no-session" | "done">("checking")
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const supabase = createClient()
    // O link do e-mail passa por /auth/callback, que troca o código por sessão e
    // redireciona pra cá. Se chegou aqui sem sessão, o link é inválido/expirou.
    supabase.auth.getUser().then(({ data }) => {
      setStatus(data.user ? "ready" : "no-session")
    })
  }, [])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const pass = String(fd.get("password") ?? "")
    const confirm = String(fd.get("confirm") ?? "")
    if (pass.length < 8) {
      setError("A senha deve ter ao menos 8 caracteres.")
      return
    }
    if (pass !== confirm) {
      setError("As senhas não coincidem.")
      return
    }
    startTransition(async () => {
      const supabase = createClient()
      const { error: upErr } = await supabase.auth.updateUser({ password: pass })
      if (upErr) {
        setError("Não foi possível redefinir. O link pode ter expirado — solicite um novo.")
        return
      }
      // Encerra a sessão de recovery e manda para o login com a nova senha.
      await supabase.auth.signOut()
      setStatus("done")
      setTimeout(() => router.push("/login"), 2200)
    })
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ position: "fixed", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)", backgroundSize: "32px 32px", opacity: 0.4, pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: "400px", position: "relative" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/wiqfy-icon-tight.png" alt="wiqfy" width={56} height={56} style={{ display: "block", margin: "0 auto 16px", objectFit: "contain" }} />
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>Nova senha</h1>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>Defina uma nova senha para sua conta</p>
        </div>

        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "14px", padding: "28px" }}>
          {status === "checking" && (
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", textAlign: "center" }}>Verificando o link...</p>
          )}

          {status === "no-session" && (
            <div>
              <div style={{ padding: "12px 14px", background: "var(--danger-soft)", border: "1px solid var(--danger-border)", borderRadius: "8px", fontSize: "13px", color: "var(--danger)", lineHeight: 1.5, marginBottom: "18px" }}>
                Link inválido ou expirado. Solicite um novo link de recuperação.
              </div>
              <Link href="/forgot-password" style={{ display: "block", textAlign: "center", fontSize: "12px", color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>
                Solicitar novo link
              </Link>
            </div>
          )}

          {status === "done" && (
            <div style={{ padding: "12px 14px", background: "var(--success-soft)", border: "1px solid var(--success-border)", borderRadius: "8px", fontSize: "13px", color: "var(--success)", lineHeight: 1.5 }}>
              Senha redefinida com sucesso. Redirecionando para o login...
            </div>
          )}

          {status === "ready" && (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "16px" }}>
                <label htmlFor="rp-pass" style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "6px" }}>Nova senha</label>
                <div style={{ position: "relative" }}>
                  <input id="rp-pass" type={showPass ? "text" : "password"} name="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" required style={inputStyle} />
                  <button type="button" onClick={() => setShowPass(!showPass)} aria-label={showPass ? "Ocultar senha" : "Mostrar senha"} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "2px" }}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label htmlFor="rp-confirm" style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "6px" }}>Confirmar nova senha</label>
                <input id="rp-confirm" type={showPass ? "text" : "password"} name="confirm" autoComplete="new-password" placeholder="Repita a senha" required style={{ ...inputStyle, paddingRight: "12px" }} />
              </div>

              {error && (
                <div style={{ marginBottom: "16px", padding: "10px 12px", background: "var(--danger-soft)", border: "1px solid var(--danger)", borderRadius: "8px", fontSize: "12px", color: "var(--danger)" }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={isPending} style={{ display: "block", width: "100%", padding: "10px", background: isPending ? "var(--accent-hover)" : "var(--accent)", color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.7 : 1, fontFamily: "inherit" }}>
                {isPending ? "Salvando..." : "Redefinir senha"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
