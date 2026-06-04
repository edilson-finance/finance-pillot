"use client"

import { useState, useEffect, useRef, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Sun, Moon, Bell, ChevronDown, Menu, Check } from "lucide-react"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { useSession } from "@/lib/session-context"
import { useMobileNav } from "@/lib/mobile-nav"
import { switchCompany } from "@/app/(app)/actions"

export function Topbar() {
  const session = useSession()
  const router = useRouter()
  const { isMobile, setOpen } = useMobileNav()
  const [theme, setTheme] = useState<"dark" | "light">("light")
  const [companyOpen, setCompanyOpen] = useState(false)
  const [switching, startSwitch] = useTransition()
  const companyRef = useRef<HTMLDivElement>(null)
  const companyInitials = session.companyName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
  const hasMultiple = session.companies.length > 1

  // Fecha o dropdown ao clicar fora.
  useEffect(() => {
    if (!companyOpen) return
    function onClick(e: MouseEvent) {
      if (companyRef.current && !companyRef.current.contains(e.target as Node)) {
        setCompanyOpen(false)
      }
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [companyOpen])

  function handleSwitch(companyId: string) {
    if (companyId === session.companyId) { setCompanyOpen(false); return }
    setCompanyOpen(false)
    startSwitch(async () => {
      const res = await switchCompany(companyId)
      if (res.ok) {
        router.push("/dashboard")
        router.refresh()
      }
    })
  }

  useEffect(() => {
    // Default claro: só fica escuro se o usuário salvou "dark" explicitamente.
    const saved = localStorage.getItem("fp-theme") as "dark" | "light" | null
    const initial = saved === "dark" ? "dark" : "light"
    setTheme(initial)
    document.documentElement.classList.toggle("light", initial === "light")
  }, [])

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark"
    setTheme(next)
    localStorage.setItem("fp-theme", next)
    document.documentElement.classList.toggle("light", next === "light")
  }

  return (
    <header style={{
      height: "52px",
      background: "var(--bg-secondary)",
      borderBottom: "1px solid var(--border)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 20px",
      position: "sticky",
      top: 0,
      zIndex: 100,
      flexShrink: 0,
      gap: "8px",
    }}>
      {/* Left: hambúrguer (mobile) + date picker */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
        {isMobile && (
          <button
            onClick={() => setOpen(true)}
            title="Menu"
            style={{
              width: "32px", height: "32px", flexShrink: 0,
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background: "var(--bg-tertiary)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "var(--text-secondary)",
            }}>
            <Menu size={16} />
          </button>
        )}
        <DateRangePicker />
      </div>

      {/* Right */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {/* Theme */}
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Modo claro" : "Modo escuro"}
          style={{
            width: "32px", height: "32px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            background: "var(--bg-tertiary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "var(--text-secondary)",
            transition: "all 0.15s",
          }}>
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        {/* Alerts */}
        <button style={{
          width: "32px", height: "32px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border)",
          background: "var(--bg-tertiary)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "var(--text-secondary)",
          position: "relative",
        }}>
          <Bell size={14} />
          <span style={{
            position: "absolute", top: "6px", right: "6px",
            width: "7px", height: "7px",
            background: "var(--danger)",
            borderRadius: "50%",
            border: "1.5px solid var(--bg-secondary)",
          }} />
        </button>

        {/* Company switcher */}
        <div ref={companyRef} style={{ position: "relative" }}>
          <button
            onClick={() => hasMultiple && setCompanyOpen((o) => !o)}
            disabled={switching}
            title={hasMultiple ? "Trocar de empresa" : session.companyName}
            style={{
              display: "flex", alignItems: "center", gap: "7px",
              padding: "4px 10px",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              fontSize: "12px", color: "var(--text-primary)",
              cursor: hasMultiple && !switching ? "pointer" : "default",
              fontFamily: "inherit",
              opacity: switching ? 0.6 : 1,
            }}>
            <div style={{
              width: "22px", height: "22px",
              background: "var(--accent-soft)",
              borderRadius: "5px",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "9px", fontWeight: 800, color: "var(--accent)",
            }}>{companyInitials || "EM"}</div>
            <span style={{ maxWidth: "110px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {session.companyName}
            </span>
            {hasMultiple && (
              <ChevronDown size={12} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            )}
          </button>

          {companyOpen && hasMultiple && (
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", right: 0,
              minWidth: "220px", maxWidth: "280px",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
              padding: "6px",
              zIndex: 200,
            }}>
              <div style={{
                fontSize: "10px", fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.4px", color: "var(--text-muted)",
                padding: "6px 8px 4px",
              }}>Suas empresas</div>
              {session.companies.map((c) => {
                const isActive = c.id === session.companyId
                return (
                  <button
                    key={c.id}
                    onClick={() => handleSwitch(c.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: "8px", width: "100%",
                      padding: "8px", textAlign: "left",
                      background: isActive ? "var(--accent-soft)" : "transparent",
                      border: "none", borderRadius: "var(--radius-sm)",
                      cursor: "pointer", fontFamily: "inherit",
                      color: "var(--text-primary)",
                    }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: "12px", fontWeight: 600,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{c.name}</div>
                      <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                        {c.role === "admin" || c.role === "super_admin" ? "Administrador" : "Membro"}
                      </div>
                    </div>
                    {isActive && <Check size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
