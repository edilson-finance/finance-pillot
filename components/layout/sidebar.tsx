"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  LayoutDashboard, ArrowLeftRight, CreditCard, Wallet,
  BarChart3, TrendingUp, FileText, RefreshCw, Activity,
  BrainCircuit, Bell, Settings, Users, Package, LogOut,
  AlertTriangle, ShieldCheck, Star, ChevronDown,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useSession, canAccess } from "@/lib/session-context"
import { useMobileNav } from "@/lib/mobile-nav"
import { useSidebarPrefs } from "@/lib/sidebar-prefs"

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  member: "Membro",
}

type NavEntry = { href: string; label: string; icon: React.ElementType; badge?: string }
type Section = { label: string; items: NavEntry[] }

const FAVORITES_LABEL = "Favoritos"

const sections: Section[] = [
  {
    label: "Visão Geral",
    items: [
      { href: "/dashboard",     label: "Dashboard",        icon: LayoutDashboard },
      { href: "/cashflow",      label: "Fluxo de Caixa",   icon: ArrowLeftRight },
    ],
  },
  {
    label: "Operação",
    items: [
      { href: "/payables",      label: "Contas a Pagar",   icon: CreditCard, badge: "3" },
      { href: "/receivables",   label: "Contas a Receber", icon: Wallet,     badge: "5" },
      { href: "/transactions",  label: "Lançamentos",      icon: TrendingUp },
      { href: "/reconciliation",label: "Conciliação",      icon: RefreshCw },
    ],
  },
  {
    label: "Análise",
    items: [
      { href: "/dre",           label: "DRE Gerencial",    icon: FileText },
      { href: "/bi",            label: "BI Financeiro",    icon: BarChart3 },
      { href: "/reports",       label: "Relatórios",       icon: Package },
    ],
  },
  {
    label: "Inteligência",
    items: [
      { href: "/health",        label: "Saúde Financeira", icon: Activity },
      { href: "/diagnostic",    label: "CFO AI",           icon: BrainCircuit },
      { href: "/delinquent",    label: "Inadimplentes",    icon: AlertTriangle, badge: "5" },
      { href: "/alerts",        label: "Alertas",          icon: Bell, badge: "4" },
    ],
  },
  {
    label: "Configuração",
    items: [
      { href: "/registers",     label: "Cadastros",        icon: Package },
      { href: "/users",         label: "Usuários",         icon: Users },
      { href: "/settings",      label: "Configurações",    icon: Settings },
    ],
  },
]

function NavItem({
  entry, isFav, onToggleFav,
}: {
  entry: NavEntry; isFav: boolean; onToggleFav: (href: string) => void
}) {
  const pathname = usePathname()
  const { href, label, icon: Icon, badge } = entry
  const active = pathname === href || (href !== "/" && pathname.startsWith(href))
  const [hover, setHover] = useState(false)

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center",
        borderRadius: "7px",
        background: active ? "var(--accent-soft)" : hover ? "var(--bg-tertiary)" : "transparent",
        border: active ? "1px solid var(--accent-medium)" : "1px solid transparent",
        marginBottom: "1px",
        transition: "background 0.13s",
      }}>
      <Link
        href={href}
        style={{
          flex: 1, minWidth: 0,
          display: "flex", alignItems: "center", gap: "8px",
          padding: "6px 4px 6px 10px",
          fontSize: "12.5px",
          color: active ? "var(--accent-light)" : hover ? "var(--text-primary)" : "var(--text-secondary)",
          fontWeight: active ? 600 : 400,
          textDecoration: "none",
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
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFav(href) }}
        title={isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        style={{
          border: "none", background: "transparent", cursor: "pointer",
          padding: "6px 8px", display: "flex", alignItems: "center", flexShrink: 0,
          color: isFav ? "var(--warning)" : "var(--text-muted)",
          opacity: isFav || hover ? 1 : 0,
          transition: "opacity 0.13s, color 0.13s",
        }}>
        <Star size={13} fill={isFav ? "var(--warning)" : "none"} />
      </button>
    </div>
  )
}

function GroupHeader({
  label, open, onToggle, icon: Icon,
}: {
  label: string; open: boolean; onToggle: () => void; icon?: React.ElementType
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "transparent", border: "none", cursor: "pointer",
        padding: "12px 10px 4px", fontFamily: "inherit",
      }}>
      <span style={{
        display: "flex", alignItems: "center", gap: "5px",
        fontSize: "9px", fontWeight: 700, color: "var(--text-muted)",
        letterSpacing: "0.9px", textTransform: "uppercase",
      }}>
        {Icon && <Icon size={10} style={{ color: "var(--warning)" }} fill="var(--warning)" />}
        {label}
      </span>
      <ChevronDown
        size={12}
        style={{
          color: "var(--text-muted)", flexShrink: 0,
          transform: open ? "rotate(0deg)" : "rotate(-90deg)",
          transition: "transform 0.18s",
        }} />
    </button>
  )
}

export function Sidebar() {
  const session = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { open, setOpen, isMobile } = useMobileNav()
  const prefs = useSidebarPrefs()

  // Fecha a gaveta ao trocar de rota.
  useEffect(() => { setOpen(false) }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  const visibleSections: Section[] = sections
    .map((sec) => ({
      ...sec,
      items: sec.items.filter((item) => canAccess(session, item.href.replace(/^\//, ""))),
    }))
    .filter((sec) => sec.items.length > 0)

  if (session.role === "super_admin") {
    visibleSections.push({
      label: "Super Admin",
      items: [
        { href: "/admin",       label: "Central Admin", icon: ShieldCheck },
        { href: "/admin/users", label: "Usuários",      icon: Users },
      ],
    })
  }

  // Índice href -> módulo, para montar o grupo Favoritos a partir dos hrefs salvos.
  const itemByHref = new Map<string, NavEntry>()
  for (const sec of visibleSections) for (const it of sec.items) itemByHref.set(it.href, it)
  const favItems = prefs.favorites
    .map((href) => itemByHref.get(href))
    .filter((it): it is NavEntry => !!it)

  const initials = session.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()

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

  const favOpen = prefs.isGroupOpen(FAVORITES_LABEL)

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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/wiqfy-icon-tight.png"
          alt="wiqfy"
          width={30}
          height={30}
          style={{ flexShrink: 0, display: "block", objectFit: "contain" }}
        />
        <div>
          <div style={{ fontSize: "14px", fontWeight: 800, letterSpacing: "-0.4px", color: "var(--text-primary)" }}>
            wiqfy
          </div>
          <div style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.8px", textTransform: "uppercase", marginTop: "1px" }}>
            Gestão Financeira
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: "8px", flex: 1, overflowY: "auto" }}>
        {/* Favoritos */}
        <div>
          <GroupHeader
            label={FAVORITES_LABEL}
            icon={Star}
            open={favOpen}
            onToggle={() => prefs.toggleGroup(FAVORITES_LABEL)}
          />
          {favOpen && (
            favItems.length > 0 ? (
              favItems.map((item) => (
                <NavItem
                  key={`fav-${item.href}`}
                  entry={item}
                  isFav={true}
                  onToggleFav={prefs.toggleFavorite}
                />
              ))
            ) : (
              <div style={{
                fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.5,
                padding: "2px 10px 6px",
              }}>
                Clique na <Star size={10} style={{ verticalAlign: "-1px", margin: "0 1px" }} /> ao lado de um módulo para fixá-lo aqui.
              </div>
            )
          )}
        </div>

        {/* Grupos */}
        {visibleSections.map((sec) => {
          const open = prefs.isGroupOpen(sec.label)
          return (
            <div key={sec.label}>
              <GroupHeader label={sec.label} open={open} onToggle={() => prefs.toggleGroup(sec.label)} />
              {open && sec.items.map((item) => (
                <NavItem
                  key={item.href}
                  entry={item}
                  isFav={prefs.isFavorite(item.href)}
                  onToggleFav={prefs.toggleFavorite}
                />
              ))}
            </div>
          )
        })}
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
