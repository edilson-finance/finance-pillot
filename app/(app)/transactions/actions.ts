"use server"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { ensureRepasse } from "@/lib/repasse"

type Result = { error: string | null }

// ── helpers ─────────────────────────────────────────────────────────────────
function str(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim()
}
function nstr(fd: FormData, k: string): string | null {
  const v = str(fd, k)
  return v || null
}
function num(fd: FormData, k: string): number {
  const v = Number(String(fd.get(k) ?? "0").replace(/\./g, "").replace(",", "."))
  return Number.isFinite(v) ? v : 0
}
function bool(fd: FormData, k: string): boolean {
  const v = str(fd, k).toLowerCase()
  return v === "on" || v === "true" || v === "1"
}
function addMonths(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1 + n, d))
  return dt.toISOString().slice(0, 10)
}
const round2 = (n: number) => Math.round(n * 100) / 100

async function ctx() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let companyId: string | null = null
  if (user) {
    const { data: prof } = await supabase
      .from("profiles").select("company_id").eq("id", user.id).single()
    companyId = (prof as any)?.company_id ?? null
  }
  return { supabase, companyId }
}

type ItemRow = { description: string; quantity: number; unit_price: number; total: number }
function parseItems(fd: FormData): ItemRow[] {
  const raw = str(fd, "items_json")
  if (!raw) return []
  try {
    const arr = JSON.parse(raw) as any[]
    return arr
      .map((i) => {
        const quantity = Number(i.quantity ?? 0)
        const unit_price = Number(i.unit_price ?? 0)
        return {
          description: String(i.description ?? "").trim(),
          quantity,
          unit_price,
          total: round2(quantity * unit_price),
        }
      })
      .filter((i) => i.description)
  } catch {
    return []
  }
}

async function saveItems(
  supabase: any, owner: "receivable_id" | "payable_id", id: string, items: ItemRow[],
) {
  if (!items.length) return
  await supabase.from("transaction_items").insert(items.map((it) => ({ [owner]: id, ...it })))
}

async function saveAttachments(
  supabase: any, companyId: string | null, ownerType: string, ownerId: string, files: File[],
) {
  if (!companyId) return
  for (const file of files) {
    if (!(file instanceof File) || file.size === 0) continue
    const safe = file.name.replace(/[^\w.\-]+/g, "_")
    const path = `${companyId}/${ownerType}/${ownerId}/${crypto.randomUUID()}-${safe}`
    const up = await supabase.storage.from("attachments").upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    })
    if (!up.error) {
      await supabase.from("attachments").insert({
        owner_type: ownerType, owner_id: ownerId, file_path: path,
        file_name: file.name, mime_type: file.type || null, size_bytes: file.size,
      })
    }
  }
}
function files(fd: FormData): File[] {
  return fd.getAll("attachments").filter((f): f is File => f instanceof File && f.size > 0)
}

// cria cliente/fornecedor avulso quando o usuário digita um nome sem selecionar id
async function ensureParty(
  supabase: any, table: "customers" | "suppliers", id: string | null, name: string | null,
  doc: string | null, email: string | null, phone: string | null,
): Promise<string | null> {
  if (id) return id
  if (!name) return null
  const { data } = await supabase
    .from(table)
    .insert({ name, document: doc, email, phone })
    .select("id").single()
  return (data as any)?.id ?? null
}

// ── RECEITA → receivables (+ baixa em transactions quando recebido) ──────────
export async function createReceita(fd: FormData): Promise<Result> {
  const { supabase, companyId } = await ctx()

  const amount = num(fd, "amount")
  const due_date = str(fd, "due_date")
  const description = nstr(fd, "description")
  if (!(amount > 0)) return { error: "Valor é obrigatório" }
  if (!due_date) return { error: "Data de vencimento é obrigatória" }
  if (!description) return { error: "Descrição é obrigatória" }
  if (!nstr(fd, "cost_center_id")) return { error: "Centro de custo é obrigatório" }

  const customer_id = await ensureParty(
    supabase, "customers", nstr(fd, "customer_id"), nstr(fd, "customer_name"),
    nstr(fd, "counterparty_doc"), nstr(fd, "email"), nstr(fd, "contact"),
  )

  const status = (str(fd, "status") || "a_receber") as
    "a_receber" | "recebido" | "recebido_parcial"

  // Juros/Multa: aceito em R$ (padrão) ou em % do Valor Total (interest_mode="percent").
  const interestInput = num(fd, "interest")
  const interest = str(fd, "interest_mode") === "percent"
    ? round2(amount * Math.max(0, interestInput) / 100)
    : Math.max(0, interestInput)

  const parcelado = bool(fd, "parcelado")
  const recorrente = bool(fd, "recorrente")
  const nParc = parcelado ? Math.max(2, Math.min(120, Number(str(fd, "installments_count") || "2"))) : 1
  const nRec = recorrente ? Math.max(2, Math.min(60, Number(str(fd, "recurrence_count") || "12"))) : 1

  const base = {
    customer_id,
    description,
    category_id: nstr(fd, "category_id"),
    account_id: nstr(fd, "account_id"),
    cost_center_id: nstr(fd, "cost_center_id"),
    competence_date: nstr(fd, "competence_date"),
    document_number: nstr(fd, "document_number"),
    payment_method: nstr(fd, "payment_method"),
    discount: num(fd, "discount"),
    interest,
    notes: nstr(fd, "notes"),
    contact: nstr(fd, "contact"),
    email: nstr(fd, "email"),
    counterparty_doc: nstr(fd, "counterparty_doc"),
    payment_term_days: str(fd, "payment_term_days") ? Number(str(fd, "payment_term_days")) : null,
    partner_id: nstr(fd, "partner_id"),
  }

  // monta o conjunto de receivables (parcelas, recorrência ou único)
  const rows: any[] = []
  if (parcelado) {
    const each = round2(amount / nParc)
    for (let i = 0; i < nParc; i++) {
      rows.push({
        ...base, amount: i === nParc - 1 ? round2(amount - each * (nParc - 1)) : each,
        due_date: addMonths(due_date, i), installment: `${i + 1}/${nParc}`,
        status: "a_receber",
      })
    }
  } else if (recorrente) {
    for (let i = 0; i < nRec; i++) {
      rows.push({ ...base, amount, due_date: addMonths(due_date, i), recurrence: "mensal", status: "a_receber" })
    }
  } else {
    rows.push({ ...base, amount, due_date, status })
  }

  // Locação/parceiro: a comissão (percentual que fica com a empresa) é calculada
  // por parcela sobre o valor daquela linha. Sem parceiro, não há comissão.
  const commissionPct = base.partner_id
    ? Math.min(100, Math.max(0, num(fd, "commission_percent")))
    : 0
  for (const r of rows) {
    r.commission_amount = commissionPct > 0 ? round2((Number(r.amount) * commissionPct) / 100) : 0
  }

  const { data: inserted, error } = await supabase.from("receivables").insert(rows).select("id, status, amount, account_id, due_date")
  if (error) return { error: error.message }
  const recs = (inserted ?? []) as any[]
  const parentId = recs[0]?.id
  if (rows.length > 1 && parentId) {
    const childIds = recs.slice(1).map((r) => r.id)
    if (childIds.length) await supabase.from("receivables").update({ parent_id: parentId }).in("id", childIds)
  }

  // baixa no caixa para os recebidos.
  // Com recebedor parceiro: o bruto entra marcado com partner_id (repasse — não é
  // receita da empresa) e os juros entram como transação própria (receita).
  const txns = recs
    .filter((r) => r.status === "recebido")
    .flatMap((r) => {
      const espelho = {
        type: "entrada", date: r.due_date, amount: r.amount, description,
        category_id: base.category_id, account_id: r.account_id, cost_center_id: base.cost_center_id,
        customer_id, receivable_id: r.id, payment_method: base.payment_method, document_number: base.document_number,
      }
      if (!base.partner_id) return [espelho]
      const out: any[] = [{ ...espelho, partner_id: base.partner_id }]
      if (base.interest > 0) {
        out.push({ ...espelho, amount: base.interest, description: `Juros — ${description}` })
      }
      return out
    })
  if (txns.length) await supabase.from("transactions").insert(txns)
  if (recs.some((r) => r.status === "recebido")) {
    await supabase.from("receivables").update({ received_at: new Date().toISOString().slice(0, 10) })
      .in("id", recs.filter((r) => r.status === "recebido").map((r) => r.id))
    // Locação/parceiro: cobrança que já nasce recebida também gera o repasse.
    if (base.partner_id) {
      for (const r of recs.filter((x) => x.status === "recebido")) {
        await ensureRepasse(supabase, r.id)
      }
    }
  }

  if (parentId) {
    if (bool(fd, "has_items")) await saveItems(supabase, "receivable_id", parentId, parseItems(fd))
    await saveAttachments(supabase, companyId, "receivable", parentId, files(fd))
  }

  revalidatePath("/transactions")
  revalidatePath("/receivables")
  return { error: null }
}

// ── DESPESA → payables (+ baixa em transactions quando pago) ─────────────────
export async function createDespesa(fd: FormData): Promise<Result> {
  const { supabase, companyId } = await ctx()

  const amount = num(fd, "amount")
  const due_date = str(fd, "due_date")
  const description = nstr(fd, "description")
  if (!(amount > 0)) return { error: "Valor é obrigatório" }
  if (!due_date) return { error: "Data de vencimento é obrigatória" }
  if (!description) return { error: "Descrição é obrigatória" }
  if (!nstr(fd, "cost_center_id")) return { error: "Centro de custo é obrigatório" }

  const supplier_id = await ensureParty(
    supabase, "suppliers", nstr(fd, "supplier_id"), nstr(fd, "supplier_name"),
    nstr(fd, "counterparty_doc"), null, null,
  )

  const status = (str(fd, "status") || "a_pagar") as "a_pagar" | "pago" | "pago_parcial"
  const parcelado = bool(fd, "parcelado")
  const recorrente = bool(fd, "recorrente")
  const nParc = parcelado ? Math.max(2, Math.min(120, Number(str(fd, "installments_count") || "2"))) : 1
  const nRec = recorrente ? Math.max(2, Math.min(60, Number(str(fd, "recurrence_count") || "12"))) : 1

  const base = {
    supplier_id,
    description,
    category_id: nstr(fd, "category_id"),
    account_id: nstr(fd, "account_id"),
    cost_center_id: nstr(fd, "cost_center_id"),
    competence_date: nstr(fd, "competence_date"),
    document_number: nstr(fd, "document_number"),
    payment_method: nstr(fd, "payment_method"),
    discount: num(fd, "discount"),
    interest: num(fd, "interest"),
    notes: nstr(fd, "notes"),
    counterparty_doc: nstr(fd, "counterparty_doc"),
    counterparty_bank: nstr(fd, "counterparty_bank"),
  }

  const rows: any[] = []
  if (parcelado) {
    const each = round2(amount / nParc)
    for (let i = 0; i < nParc; i++) {
      rows.push({
        ...base, amount: i === nParc - 1 ? round2(amount - each * (nParc - 1)) : each,
        due_date: addMonths(due_date, i), installment: `${i + 1}/${nParc}`, status: "a_pagar",
      })
    }
  } else if (recorrente) {
    for (let i = 0; i < nRec; i++) {
      rows.push({ ...base, amount, due_date: addMonths(due_date, i), recurrence: "mensal", status: "a_pagar" })
    }
  } else {
    rows.push({ ...base, amount, due_date, status })
  }

  const { data: inserted, error } = await supabase.from("payables").insert(rows).select("id, status, amount, account_id, due_date")
  if (error) return { error: error.message }
  const pays = (inserted ?? []) as any[]
  const parentId = pays[0]?.id
  if (rows.length > 1 && parentId) {
    const childIds = pays.slice(1).map((p) => p.id)
    if (childIds.length) await supabase.from("payables").update({ parent_id: parentId }).in("id", childIds)
  }

  const txns = pays
    .filter((p) => p.status === "pago")
    .map((p) => ({
      type: "saida", date: p.due_date, amount: p.amount, description,
      category_id: base.category_id, account_id: p.account_id, cost_center_id: base.cost_center_id,
      supplier_id, payable_id: p.id, payment_method: base.payment_method, document_number: base.document_number,
    }))
  if (txns.length) await supabase.from("transactions").insert(txns)
  if (pays.some((p) => p.status === "pago")) {
    await supabase.from("payables").update({ paid_at: new Date().toISOString().slice(0, 10) })
      .in("id", pays.filter((p) => p.status === "pago").map((p) => p.id))
  }

  if (parentId) {
    if (bool(fd, "has_items")) await saveItems(supabase, "payable_id", parentId, parseItems(fd))
    await saveAttachments(supabase, companyId, "payable", parentId, files(fd))
  }

  revalidatePath("/transactions")
  revalidatePath("/payables")
  return { error: null }
}

// ── TRANSFERÊNCIA → transactions (neutra no DRE) ─────────────────────────────
export async function createTransferencia(fd: FormData): Promise<Result> {
  const { supabase, companyId } = await ctx()

  const amount = num(fd, "amount")
  const date = str(fd, "date")
  const account_id = nstr(fd, "account_id")
  const to_account_id = nstr(fd, "to_account_id")
  if (!(amount > 0)) return { error: "Valor é obrigatório" }
  if (!date) return { error: "Data é obrigatória" }
  if (!account_id) return { error: "Conta de origem é obrigatória" }
  if (!to_account_id) return { error: "Conta de destino é obrigatória" }
  if (account_id === to_account_id) return { error: "Conta de origem e destino devem ser diferentes" }

  const { data: inserted, error } = await supabase.from("transactions").insert({
    type: "transferencia", date, amount,
    description: nstr(fd, "description"),
    account_id, to_account_id,
    fee: num(fd, "fee"), tax: num(fd, "tax"),
    payment_method: nstr(fd, "transfer_type"),
    document_number: nstr(fd, "document_number"),
  }).select("id").single()
  if (error) return { error: error.message }

  const id = (inserted as any)?.id
  if (id) await saveAttachments(supabase, companyId, "transaction", id, files(fd))

  revalidatePath("/transactions")
  return { error: null }
}

// ── exclusão (usada na listagem do extrato/edição) ───────────────────────────
export async function deleteTransaction(id: string): Promise<Result> {
  const supabase = await createClient()
  const { error } = await supabase.from("transactions").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/transactions")
  return { error: null }
}
