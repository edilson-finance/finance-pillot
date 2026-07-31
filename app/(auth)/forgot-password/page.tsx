"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { createClient } from "@/lib/supabase/client"

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  background: "var(--bg-tertiary)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  fontSize: "13px",
  color: "var(--text-primary)",
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
}

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim()
    startTransition(async () => {
      const supabase = createClient()
      // Não tratamos o retorno para não revelar se o e-mail existe (anti-enumeração).
      // O Supabase já responde igual para conta existente/inexistente.
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      })
      setSent(true)
    })
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ position: "fixed", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)", backgroundSize: "32px 32px", opacity: 0.4, pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: "400px", position: "relative" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/wiqfy-icon-tight.png" alt="wiqfy" width={56} height={56} style={{ display: "block", margin: "0 auto 16px", objectFit: "contain" }} />
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>Recuperar senha</h1>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
            Enviamos um link para redefinir sua senha
          </p>
        </div>

        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "14px", padding: "28px" }}>
          {sent ? (
            <div>
              <div style={{ padding: "12px 14px", background: "var(--success-soft)", border: "1px solid var(--success-border)", borderRadius: "8px", fontSize: "13px", color: "var(--success)", lineHeight: 1.5, marginBottom: "18px" }}>
                Se existir uma conta com esse e-mail, enviamos um link para redefinir a senha. Verifique sua caixa de entrada e o spam.
              </div>
              <Link href="/login" style={{ display: "block", textAlign: "center", fontSize: "12px", color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>
                Voltar para o login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "20px" }}>
                <label htmlFor="fp-email" style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "6px" }}>
                  E-mail
                </label>
                <input id="fp-email" type="email" name="email" autoComplete="email" placeholder="seu@email.com" required style={inputStyle} />
              </div>

              <button type="submit" disabled={isPending} style={{ display: "block", width: "100%", padding: "10px", background: isPending ? "var(--accent-hover)" : "var(--accent)", color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.7 : 1, fontFamily: "inherit" }}>
                {isPending ? "Enviando..." : "Enviar link de recuperação"}
              </button>

              <div style={{ textAlign: "center", marginTop: "20px", paddingTop: "20px", borderTop: "1px solid var(--border)", fontSize: "12px", color: "var(--text-secondary)" }}>
                Lembrou a senha?{" "}
                <Link href="/login" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>
                  Entrar
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
