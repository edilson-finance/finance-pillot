import type { SupabaseClient } from "@supabase/supabase-js"

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Gera a conta a pagar do repasse ao parceiro de uma cobrança recebida.
 *
 * Regra: numa cobrança com parceiro, o que fica com a empresa é a comissão
 * (`commission_amount`); o restante pertence ao parceiro e vira uma obrigação
 * rastreável em Contas a Pagar.
 *
 * Idempotente por dois caminhos: verifica antes de inserir E o banco tem índice
 * único em `payables.source_receivable_id` (migration 0037) — mesmo em clique
 * duplo concorrente, no máximo um repasse por cobrança.
 *
 * O repasse fica SEM categoria de propósito: é dinheiro de terceiro passando
 * pelo caixa, então não deve entrar na DRE (a `fn_dre` também o ignora pelo
 * `source_receivable_id`).
 */
export async function ensureRepasse(
  supabase: SupabaseClient,
  receivableId: string,
): Promise<{ error: string | null }> {
  const { data: r, error: loadErr } = await supabase
    .from("receivables")
    .select("id, amount, commission_amount, partner_id, description, due_date, cost_center_id")
    .eq("id", receivableId)
    .maybeSingle()
  if (loadErr) return { error: loadErr.message }
  if (!r || !r.partner_id) return { error: null } // sem parceiro: nada a repassar

  const repasse = round2(Number(r.amount ?? 0) - Number(r.commission_amount ?? 0))
  if (repasse <= 0) return { error: null }

  const { data: existente } = await supabase
    .from("payables").select("id").eq("source_receivable_id", r.id).limit(1)
  if (existente && existente.length > 0) return { error: null }

  const { data: parceiro } = await supabase
    .from("partners").select("name").eq("id", r.partner_id).maybeSingle()

  const { error } = await supabase.from("payables").insert({
    partner_id: r.partner_id,
    source_receivable_id: r.id,
    description: `Repasse${parceiro?.name ? ` — ${parceiro.name}` : ""}${r.description ? ` · ${r.description}` : ""}`,
    due_date: r.due_date,
    amount: repasse,
    status: "a_pagar",
    category_id: null,
    cost_center_id: r.cost_center_id ?? null,
  })
  // Corrida perdida para outra requisição: o índice único barrou — não é erro.
  if (error && !/duplicate key|unique/i.test(error.message)) return { error: error.message }
  return { error: null }
}
