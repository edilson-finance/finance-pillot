"use client"

import { createContext, useContext, ReactNode } from "react"

export type UserRole = "super_admin" | "admin" | "member"

export interface CompanyMembership {
  id: string
  name: string
  role: UserRole
}

export interface SessionInfo {
  userId: string
  name: string
  email: string
  role: UserRole
  // Empresa ativa (profiles.company_id).
  companyId: string | null
  companyName: string
  // Empresas das quais o usuário participa (para o seletor de empresa).
  companies: CompanyMembership[]
  // Module keys the current user is allowed to open. Admins/super_admins get all.
  allowedModules: string[]
}

const Ctx = createContext<SessionInfo | null>(null)

export function SessionProvider({ value, children }: { value: SessionInfo; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSession(): SessionInfo {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useSession must be used inside SessionProvider")
  return ctx
}

export function canAccess(session: SessionInfo, moduleKey: string): boolean {
  if (session.role === "admin" || session.role === "super_admin") return true
  return session.allowedModules.includes(moduleKey)
}
