// Canonical app modules. The `key` matches the route segment and the value
// passed to the `has_module_access(module)` SQL helper. Used by both the
// member-permission editor (Users screen) and the sidebar nav filter.

export interface AppModule {
  key: string
  label: string
  section: string
  // adminOnly modules are never offered as member-toggleable and are hidden
  // from members in the sidebar (admins/super_admins always see them).
  adminOnly?: boolean
}

export const MODULES: AppModule[] = [
  { key: "dashboard", label: "Dashboard", section: "Principal" },
  { key: "cashflow", label: "Fluxo de Caixa", section: "Principal" },
  { key: "payables", label: "Contas a Pagar", section: "Principal" },
  { key: "receivables", label: "Contas a Receber", section: "Principal" },
  { key: "dre", label: "DRE Gerencial", section: "Análise" },
  { key: "bi", label: "BI Financeiro", section: "Análise" },
  { key: "reports", label: "Relatórios", section: "Análise" },
  { key: "reconciliation", label: "Conciliação", section: "Análise" },
  { key: "health", label: "Saúde Financeira", section: "Inteligência" },
  { key: "diagnostic", label: "CFO AI", section: "Inteligência" },
  { key: "delinquent", label: "Inadimplentes", section: "Inteligência" },
  { key: "alerts", label: "Alertas", section: "Inteligência" },
  { key: "transactions", label: "Lançamentos", section: "Gestão" },
  { key: "registers", label: "Cadastros", section: "Gestão" },
  { key: "users", label: "Usuários", section: "Gestão", adminOnly: true },
  { key: "settings", label: "Configurações", section: "Gestão", adminOnly: true },
]

// Modules an admin can grant to a member.
export const MEMBER_MODULES = MODULES.filter((m) => !m.adminOnly)

export const MODULE_LABELS: Record<string, string> = Object.fromEntries(
  MODULES.map((m) => [m.key, m.label]),
)
