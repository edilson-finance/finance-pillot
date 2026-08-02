"use server"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

type Result = { error: string | null }

function parsePayload(formData: FormData) {
  const payload: Record<string, unknown> = {
    customer_id: (String(formData.get("customer_id") ?? "").trim() || null),
    description: (String(formData.get("description") ?? "").trim() || null),
    category_id: (String(formData.get("category_id") ?? "").trim() || null),
    due_date: String(formData.get("due_date") ?? "").trim(),
    installment: (String(formData.get("installment") ?? "").trim() || null),
    amount: Number(formData.get("amount") ?? 0),
    status: String(formData.get("status") ?? "a_receber"),
    account_id: (String(formData.get("account_id") ?? "").trim() || null),
  }
  // partner_id só entra quando o campo veio no form (função ligada); assim,
  // editar com a função desligada não apaga o parceiro já vinculado.
  if (formData.has("partner_id")) {
    payload.partner_id = (String(formData.get("partner_id") ?? "").trim() || null)
  }
  return payload
}

function revalidate() {
  revalidatePath("/receivables")
  revalidatePath("/delinquent")
}

export async function createReceivable(formData: FormData): Promise<Result> {
  const supabase = await createClient()
  const payload = parsePayload(formData)
  if (!payload.due_date) return { error: "Vencimento é obrigatório" }
  const { error } = await supabase.from("receivables").insert(payload)
  if (error) return { error: error.message }
  revalidate()
  return { error: null }
}

export async function updateReceivable(id: string, formData: FormData): Promise<Result> {
  const supabase = await createClient()
  const payload = parsePayload(formData)
  if (!payload.due_date) return { error: "Vencimento é obrigatório" }
  const { error } = await supabase.from("receivables").update(payload).eq("id", id)
  if (error) return { error: error.message }
  revalidate()
  return { error: null }
}

export async function deleteReceivable(id: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from("receivables").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidate()
  return { error: null }
}

export async function markReceived(id: string): Promise<Result> {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)

  // Carrega o título para gerar o espelho no caixa (transactions) — antes esta
  // action só trocava o status, então "marcar como recebido" na lista NÃO movia o
  // caixa, ao contrário de lançar já como recebido no formulário. Isso deixava o
  // fluxo de caixa/saldo divergente conforme por onde o usuário baixava.
  const { data: rec, error: loadErr } = await supabase
    .from("receivables")
    .select("id, status, amount, description, category_id, account_id, cost_center_id, customer_id, payment_method, document_number, partner_id, interest, due_date")
    .eq("id", id)
    .maybeSingle()
  if (loadErr) return { error: loadErr.message }
  if (!rec) return { error: "Título não encontrado." }

  // Idempotência: já recebido → nada a fazer.
  if (rec.status === "recebido") { revalidate(); return { error: null } }

  // Só gera o movimento se ainda não há transação para este título (evita duplicar
  // quando o título já nasceu recebido, ou em clique duplo).
  const { data: existing } = await supabase
    .from("transactions").select("id").eq("receivable_id", id).limit(1)
  if (!existing || existing.length === 0) {
    const espelho: Record<string, unknown> = {
      type: "entrada", date: rec.due_date ?? today, amount: rec.amount, description: rec.description,
      category_id: rec.category_id, account_id: rec.account_id, cost_center_id: rec.cost_center_id,
      customer_id: rec.customer_id, receivable_id: rec.id,
      payment_method: rec.payment_method, document_number: rec.document_number,
    }
    // Recebedor parceiro (igual ao createReceita): o bruto entra como repasse
    // (partner_id) e os juros, quando houver, como receita própria (sem partner_id).
    const txns: Record<string, unknown>[] = []
    if (rec.partner_id) {
      txns.push({ ...espelho, partner_id: rec.partner_id })
      if (Number(rec.interest ?? 0) > 0) {
        txns.push({ ...espelho, amount: rec.interest, description: `Juros — ${rec.description ?? ""}` })
      }
    } else {
      txns.push(espelho)
    }
    const { error: txErr } = await supabase.from("transactions").insert(txns)
    if (txErr) return { error: txErr.message }
  }

  const { error } = await supabase
    .from("receivables").update({ status: "recebido", received_at: today }).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/transactions")
  revalidate()
  return { error: null }
}
