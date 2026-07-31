"use client"

import Link from "next/link"
import { useState, useTransition, useEffect } from "react"
import { Eye, EyeOff } from "lucide-react"
import { login } from "./actions"

export default function LoginPage() {
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [next, setNext] = useState("")
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const n = new URLSearchParams(window.location.search).get("next")
    if (n) setNext(n)
  }, [])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await login(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-primary)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
    }}>
      {/* Background grid */}
      <div style={{
        position: "fixed",
        inset: 0,
        backgroundImage: "radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)",
        backgroundSize: "32px 32px",
        opacity: 0.4,
        pointerEvents: "none",
      }} />

      <div style={{
        width: "100%",
        maxWidth: "400px",
        position: "relative",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/wiqfy-icon-tight.png"
            alt="wiqfy"
            width={56}
            height={56}
            style={{ display: "block", margin: "0 auto 16px", objectFit: "contain" }}
          />
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
            wiqfy
          </h1>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
            Acesse sua conta
          </p>
        </div>

        {/* Form */}
        <div style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          padding: "28px",
        }}>
          <form onSubmit={handleSubmit}>
            <input type="hidden" name="next" value={next} />
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "6px" }}>
                E-mail
              </label>
              <input
                type="email"
                name="email"
                placeholder="seu@email.com"
                required
                style={{
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
                }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "6px" }}>
                Senha
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"}
                  name="password"
                  placeholder="••••••••"
                  required
                  style={{
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
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    padding: "2px",
                  }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <div style={{ textAlign: "right", marginTop: "6px" }}>
                <Link href="/forgot-password" style={{ fontSize: "11px", color: "var(--accent)", textDecoration: "none" }}>
                  Esqueceu a senha?
                </Link>
              </div>
            </div>

            {error && (
              <div style={{
                marginBottom: "16px",
                padding: "10px 12px",
                background: "var(--danger-soft)",
                border: "1px solid var(--danger)",
                borderRadius: "8px",
                fontSize: "12px",
                color: "var(--danger)",
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              style={{
                display: "block",
                width: "100%",
                padding: "10px",
                background: isPending ? "var(--accent-hover)" : "var(--accent)",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: isPending ? "not-allowed" : "pointer",
                opacity: isPending ? 0.7 : 1,
                fontFamily: "inherit",
              }}>
              {isPending ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div style={{
            textAlign: "center",
            marginTop: "20px",
            paddingTop: "20px",
            borderTop: "1px solid var(--border)",
            fontSize: "12px",
            color: "var(--text-secondary)",
          }}>
            Não tem conta?{" "}
            <Link href="/signup" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>
              Criar conta grátis
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
