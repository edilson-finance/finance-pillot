import { createClient } from "@/lib/supabase/server"
import { getSessionContext } from "@/lib/auth"
import UsersClient, { type CompanyUser, type PendingInvite } from "./users-client"

export const metadata = { title: "Usuários" }


export default async function UsersPage() {
  const session = await getSessionContext()

  if (session.role !== "admin" && session.role !== "super_admin") {
    return (
      <div style={{ padding: "22px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)" }}>Acesso restrito</h1>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
          Apenas administradores podem gerenciar usuários e permissões.
        </p>
      </div>
    )
  }

  const supabase = await createClient()
  const [{ data: usersRaw }, { data: perms }, { data: invitesRaw }] = await Promise.all([
    supabase.rpc("fn_company_users"),
    supabase.from("member_permissions").select("user_id, module").eq("allowed", true),
    supabase.from("invites").select("id, email, role, status, created_at, expires_at")
      .eq("status", "pending").order("created_at", { ascending: false }),
  ])

  const permsByUser = new Map<string, string[]>()
  for (const p of perms ?? []) {
    const arr = permsByUser.get(p.user_id) ?? []
    arr.push(p.module)
    permsByUser.set(p.user_id, arr)
  }

  const users: CompanyUser[] = (usersRaw ?? []).map((u: { id: string; name: string; role: string; email: string; active: boolean; created_at: string }) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    active: u.active,
    modules: permsByUser.get(u.id) ?? [],
  }))

  const invites: PendingInvite[] = (invitesRaw ?? []).map((i: { id: string; email: string; role: string; status: string; created_at: string; expires_at: string }) => ({
    id: i.id,
    email: i.email,
    role: i.role,
    createdAt: i.created_at,
    expiresAt: i.expires_at,
  }))

  return <UsersClient currentUserId={session.userId} currentRole={session.role} users={users} invites={invites} />
}
