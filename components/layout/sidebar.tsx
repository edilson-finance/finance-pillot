"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import {
  LayoutDashboard, ArrowLeftRight, CreditCard, Wallet,
  BarChart3, TrendingUp, FileText, RefreshCw, Activity,
  BrainCircuit, Bell, Settings, Users, Package, Zap, LogOut,
  AlertTriangle, ShieldCheck,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useSession, canAccess } from "@/lib/session-context"
import { useMobileNav } from "@/lib/mobile-nav"

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  member: "Membro",
}

const sections = [
  {
    label: "Principal",
    items: [
      { href: "/dashboard",     label: "Dashboard",       icon: LayoutDashboard },
      { href: "/cashflow",      label: "Fluxo de Caixa",  icon: ArrowLeftRight },
      { href: "/payables",      label: "Contas a Pagar",  icon: CreditCard,  badge: "3" },
      { href: "/receivables",   label: "Contas a Receber",icon: Wallet,      badge: "5" },
    ],
  },
  {
    label: "Análise",
    items: [
      { href: "/dre",           label: "DRE Gerencial",   icon: FileText },
      { href: "/bi",            label: "BI Financeiro",   icon: BarChart3 },
      { href: "/reports",       label: "Relatórios",      icon: Package },
      { href: "/reconciliation",label: "Conciliação",     icon: RefreshCw },
    ],
  },
  {
    label: "Inteligência",
    items: [
      { href: "/health",        label: "Saúde Financeira",icon: Activity },
      { href: "/diagnostic",    label: "CFO AI",          icon: BrainCircuit },
      { href: "/delinquent",    label: "Inadimplentes",   icon: AlertTriangle, badge: "5" },
      { href: "/alerts",        label: "Alertas",         icon: Bell, badge: "4" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/transactions",  label: "Lançamentos",     icon: TrendingUp },
      { href: "/registers",     label: "Cadastros",       icon: Package },
      { href: "/users",         label: "Usuários",        icon: Users },
      { href: "/settings",      label: "Configurações",   icon: Settings },
    ],
  },
]

function NavItem({ href, label, icon: Icon, badge }: { href: string; label: string; icon: React.ElementType; badge?: string }) {
  const pathname = usePathname()
  const active = pathname === href || (href !== "/" && pathname.startsWith(href))

  return (
    <Link
      href={href}
      style={{
        display: "flex", alignItems: "center", gap: "8px",
        padding: "6px 10px",
        borderRadius: "7px",
        fontSize: "12.5px",
        color: active ? "var(--accent-light)" : "var(--text-secondary)",
        background: active ? "var(--accent-soft)" : "transparent",
        fontWeight: active ? 600 : 400,
        textDecoration: "none",
        transition: "all 0.13s",
        marginBottom: "1px",
        border: active ? "1px solid var(--accent-medium)" : "1px solid transparent",
      }}
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = "var(--bg-tertiary)"
          ;(e.currentTarget as HTMLElement).style.color = "var(--text-primary)"
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = "transparent"
          ;(e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"
        }
      }}>
      <Icon size={14} style={{ flexShrink: 0, opacity: active ? 1 : 0.65 }} />
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      {badge && (
        <span style={{
          background: "var(--danger)", color: "#fff",
          fontSize: "9px", fontWeight: 700,
          padding: "1px 5px", borderRadius: "8px", lineHeight: "14px",
        }}>{badge}</span>
      )}
    </Link>
  )
}

export function Sidebar() {
  const session = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { open, setOpen, isMobile } = useMobileNav()

  // Fecha a gaveta ao trocar de rota.
  useEffect(() => { setOpen(false) }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  const visibleSections = sections
    .map(sec => ({
      ...sec,
      items: sec.items.filter(item => canAccess(session, item.href.replace(/^\//, ""))),
    }))
    .filter(sec => sec.items.length > 0)

  if (session.role === "super_admin") {
    visibleSections.push({
      label: "Super Admin",
      items: [
        { href: "/admin",       label: "Central Admin", icon: ShieldCheck },
        { href: "/admin/users", label: "Usuários",      icon: Users },
      ],
    })
  }

  const initials = session.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()

  const asideStyle: React.CSSProperties = isMobile
    ? {
        width: "260px", minWidth: "260px",
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        height: "100vh",
        position: "fixed", top: 0, left: 0,
        zIndex: 300,
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.22s ease",
        boxShadow: open ? "var(--shadow-lg)" : "none",
      }
    : {
        width: "214px", minWidth: "214px",
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        height: "100vh",
        position: "sticky", top: 0,
        flexShrink: 0,
      }

  return (
    <>
    {isMobile && open && (
      <div
        onClick={() => setOpen(false)}
        style={{
          position: "fixed", inset: 0, zIndex: 290,
          background: "rgba(0,0,0,0.5)",
        }}
      />
    )}
    <aside style={asideStyle}>
      {/* Logo */}
      <div style={{
        padding: "14px 14px 12px",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: "9px",
        flexShrink: 0,
      }}>
        <div style={{
          width: "30px", height: "30px",
          background: "linear-gradient(135deg, var(--accent), var(--purple))",
          borderRadius: "8px",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
          boxShadow: "0 2px 8px rgba(79,70,229,0.4)",
        }}>
          <Zap size={15} color="#fff" strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ fontSize: "14px", fontWeight: 800, letterSpacing: "-0.4px", color: "var(--text-primary)" }}>
            FinancePilot
          </div>
          <div style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.8px", textTransform: "uppercase", marginTop: "1px" }}>
            Gestão Financeira
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: "8px", flex: 1, overflowY: "auto" }}>
        {visibleSections.map(sec => (
          <div key={sec.label}>
            <div style={{
              fontSize: "9px", fontWeight: 700,
              color: "var(--text-muted)",
              letterSpacing: "0.9px", textTransform: "uppercase",
              padding: "12px 10px 4px",
            }}>{sec.label}</div>
            {sec.items.map(item => <NavItem key={item.href} {...item} />)}
          </div>
        ))}
      </nav>

      {/* User */}
      <div style={{
        padding: "10px 10px",
        borderTop: "1px solid var(--border)",
        flexShrink: 0,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "8px 10px",
          borderRadius: "8px",
          background: "var(--bg-tertiary)",
        }}>
          <div style={{
            width: "28px", height: "28px",
            background: "linear-gradient(135deg, var(--accent), var(--purple))",
            borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "11px", fontWeight: 800, color: "#fff",
            flexShrink: 0,
          }}>{initials || "U"}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.name}</div>
            <div style={{ fontSize: "10px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ROLE_LABEL[session.role] ?? session.role}</div>
          </div>
          <button onClick={signOut} title="Sair" style={{
            border: "none", background: "transparent", cursor: "pointer",
            color: "var(--text-muted)", display: "flex", alignItems: "center", flexShrink: 0, padding: 0,
          }}>
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
    </>
  )
}
