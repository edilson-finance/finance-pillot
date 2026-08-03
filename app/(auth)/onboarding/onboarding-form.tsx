"use client"

import { useState, useTransition } from "react"
import { Zap } from "lucide-react"
import { COMPANY_PROFILES, type CompanyType } from "@/lib/company-context"
import { completeOnboarding } from "./actions"

export function OnboardingForm() {
  const [selectedType, setSelectedType] = useState<CompanyType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!selectedType) {
      setError("Selecione o tipo de empresa.")
      return
    }
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await completeOnboarding(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div style={{
      minHeight: "100dvh",
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
        maxWidth: "560px",
        position: "relative",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            width: "48px",
            height: "48px",
            background: "var(--accent)",
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <Zap size={22} color="#fff" strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
            Configure sua empresa
          </h1>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
            Conte um pouco sobre você e sua empresa para personalizar a experiência
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
            {/* Hidden company_type input */}
            <input type="hidden" name="company_type" value={selectedType ?? ""} />

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "6px" }}>
                Seu nome
              </label>
              <input
                type="text"
                name="user_name"
                placeholder="Como devemos te chamar?"
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
                Nome da empresa
              </label>
              <input
                type="text"
                name="company_name"
                placeholder="Nome da sua empresa"
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

            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "10px" }}>
                Tipo de empresa
              </label>
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
              }}>
                {(Object.values(COMPANY_PROFILES) as typeof COMPANY_PROFILES[keyof typeof COMPANY_PROFILES][]).map((profile) => {
                  const isSelected = selectedType === profile.key
                  return (
                    <button
                      key={profile.key}
                      type="button"
                      onClick={() => setSelectedType(profile.key)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 12px",
                        background: isSelected ? "var(--accent-soft)" : "var(--bg-tertiary)",
                        border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                        borderRadius: "8px",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "border-color 0.15s, background 0.15s",
                      }}>
                      <span style={{ fontSize: "20px", lineHeight: 1 }}>{profile.icon}</span>
                      <span style={{
                        fontSize: "12px",
                        fontWeight: isSelected ? 600 : 400,
                        color: isSelected ? "var(--accent-light)" : "var(--text-primary)",
                        fontFamily: "inherit",
                      }}>
                        {profile.shortLabel}
                      </span>
                    </button>
                  )
                })}
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
              {isPending ? "Configurando..." : "Começar a usar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
