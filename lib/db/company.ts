import { createClient } from "@/lib/supabase/server"

export interface CompanySettings {
  id: string
  name: string
  type: string
  logo_url: string | null
  razao_social: string | null
  cnpj: string | null
  inscricao_estadual: string | null
  segmento: string | null
  regime_tributario: string | null
  regime_financeiro: string | null
  telefone: string | null
  whatsapp: string | null
  email: string | null
  site: string | null
  cep: string | null
  endereco: string | null
  cidade: string | null
  estado: string | null
}

const COLS =
  "id, name, type, logo_url, razao_social, cnpj, inscricao_estadual, segmento, regime_tributario, regime_financeiro, telefone, whatsapp, email, site, cep, endereco, cidade, estado"

/** Carrega o cadastro da empresa do usuário logado (RLS escopa por company_id). */
export async function getCompanySettings(): Promise<CompanySettings | null> {
  const supabase = await createClient()
  const { data: prof } = await supabase.from("profiles").select("company_id").single()
  if (!prof?.company_id) return null
  const { data, error } = await supabase
    .from("companies")
    .select(COLS)
    .eq("id", prof.company_id)
    .single()
  if (error) return null
  return data as unknown as CompanySettings
}
