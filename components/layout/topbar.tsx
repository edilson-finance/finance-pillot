"use client"

import { useState, useEffect } from "react"
import { Sun, Moon, Bell, ChevronDown, Menu } from "lucide-react"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { useSession } from "@/lib/session-context"
import { useMobileNav } from "@/lib/mobile-nav"

export function Topbar() {
  const session = useSession()
  const { isMobile, setOpen } = useMobileNav()
  const [theme, setTheme] = useState<"dark" | "light">("dark")
  const companyInitials = session.companyName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()

  useEffect(() => {
    const saved = localStorage.getItem("fp-theme") as "dark" | "light" | null
    if (saved) {
      setTheme(saved)
      document.documentElement.classList.toggle("light", saved === "light")
    }
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

        {/* Company */}
        <button style={{
          display: "flex", alignItems: "center", gap: "7px",
          padding: "4px 10px",
          background: "var(--bg-tertiary)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          fontSize: "12px", color: "var(--text-primary)",
          cursor: "pointer",
          fontFamily: "inherit",
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
          <ChevronDown size={12} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
        </button>
      </div>
    </header>
  )
}
