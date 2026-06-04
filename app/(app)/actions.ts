"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

type Result = { ok: boolean; error?: string }

// Troca a empresa ativa do usuário (profiles.company_id) via RPC security
// definer. O RPC valida que o usuário participa da empresa (company_members)
// ou é super admin. Depois revalida todo o layout para recarregar sessão,
// permissões e dados sob a nova empresa.
export async function switchCompany(companyId: string): Promise<Result> {
  if (!companyId) return { ok: false, error: "Empresa inválida." }
  const supabase = await createClient()
  const { error } = await supabase.rpc("fn_switch_company", { p_company_id: companyId })
  if (error) return { ok: false, error: error.message }
  revalidatePath("/", "layout")
  return { ok: true }
}
