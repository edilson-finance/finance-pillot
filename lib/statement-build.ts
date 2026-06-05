// Builder PURO do Extrato de Movimentação. Sem I/O: recebe os dados já
// carregados (lib/statement-data) e produz os grupos por conta, as linhas com
// saldo realizado e previsto correntes, e os 5 KPIs do período.
//
// Princípio que garante "bater 100% com as contas": o SALDO REALIZADO de uma
// conta é definido EXCLUSIVAMENTE pelas transações de caixa (entrada/saída),
// que já incluem as baixas-espelho de pagáveis/recebíveis. Os itens em aberto
// (pagáveis/recebíveis ainda não baixados) afetam apenas o saldo PREVISTO e os
// KPIs — nunca o realizado. Assim não há dupla contagem.

import type { TxnRow, OpenRow, AccountRow } from "@/lib/statement-data"

const SEM_CONTA = "__sem_conta__"

// Status que ainda representam saldo em aberto (não totalmente liquidado).
// 'recebido'/'pago' já têm a baixa registrada em transactions (saldo realizado).
function isOpen(status: string): boolean {
  return status !== "recebido" && status !== "pago"
}

export interface StatementFilters {
  accountId: string // "" = todas as contas
  search: string
}

export interface StatementInput {
  accounts: AccountRow[]
  // saldo realizado acumulado ANTES do período, por conta (null -> SEM_CONTA).
  priorByAccount: Record<string, number>
  transactions: TxnRow[] // do período, apenas entrada/saída
  receivables: OpenRow[] // do período (por vencimento)
  payables: OpenRow[] // do período (por vencimento)
}

export interface StatementLine {
  id: string
  kind: "realized" | "open"
  date: string
  description: string
  situacao: string // "Realizado" | "Em aberto"
  signed: number // +entrada / -saída
  // saldo realizado corrente; null nas linhas em aberto (não alteram o realizado)
  saldoRealizado: number | null
  saldoPrevisto: number // saldo previsto corrente (realizado + aberto)
}

export interface StatementGroup {
  accountId: string | null
  accountName: string
  bank: string
  saldoAnterior: number
  lines: StatementLine[]
  saldoRealizadoFinal: number
  saldoPrevistoFinal: number
}

export interface StatementKpis {
  receitasRealizadas: number
  despesasRealizadas: number
  receitasEmAberto: number
  despesasEmAberto: number
  totalPeriodo: number
}

export interface BuiltStatement {
  groups: StatementGroup[]
  kpis: StatementKpis
}

const sum = (arr: number[]) => arr.reduce((s, v) => s + v, 0)

function accountKey(id: string | null): string {
  return id ?? SEM_CONTA
}

// Linha intermediária antes de calcular saldos correntes.
interface RawLine {
  id: string
  kind: "realized" | "open"
  date: string
  description: string
  signed: number
}

function matchesSearch(description: string, search: string): boolean {
  const q = search.trim().toLowerCase()
  if (!q) return true
  return description.toLowerCase().includes(q)
}

export function buildStatement(input: StatementInput, filters: StatementFilters): BuiltStatement {
  const { accountId } = filters
  const onlyAccount = accountId !== ""

  // --- Coleta das linhas brutas por conta ---
  const rawByAccount = new Map<string, RawLine[]>()
  const pushRaw = (key: string, line: RawLine) => {
    const arr = rawByAccount.get(key) ?? []
    arr.push(line)
    rawByAccount.set(key, arr)
  }

  // Realizadas (transações de caixa). Definem o saldo realizado.
  const txns = input.transactions.filter(
    (t) => (t.type === "entrada" || t.type === "saida") && (!onlyAccount || t.accountId === accountId),
  )
  for (const t of txns) {
    pushRaw(accountKey(t.accountId), {
      id: t.id,
      kind: "realized",
      date: t.date,
      description: t.description || "—",
      signed: t.type === "entrada" ? t.amount : -t.amount,
    })
  }

  // Em aberto (recebíveis e pagáveis ainda não baixados). Afetam só o previsto.
  const openRec = input.receivables.filter(
    (r) => isOpen(r.status) && (!onlyAccount || r.accountId === accountId),
  )
  const openPay = input.payables.filter(
    (p) => isOpen(p.status) && (!onlyAccount || p.accountId === accountId),
  )
  for (const r of openRec) {
    pushRaw(accountKey(r.accountId), {
      id: `r_${r.id}`,
      kind: "open",
      date: r.dueDate,
      description: r.description || r.partyName || "—",
      signed: r.amount,
    })
  }
  for (const p of openPay) {
    pushRaw(accountKey(p.accountId), {
      id: `p_${p.id}`,
      kind: "open",
      date: p.dueDate,
      description: p.description || p.partyName || "—",
      signed: -p.amount,
    })
  }

  // --- Monta os grupos por conta ---
  const accById = new Map(input.accounts.map((a) => [a.id, a]))
  // Ordem dos grupos: as contas cadastradas (na ordem recebida) e, por fim,
  // "Sem conta" caso tenha linhas. Sob filtro de conta, só essa conta.
  const orderedKeys: string[] = []
  for (const a of input.accounts) {
    if (onlyAccount && a.id !== accountId) continue
    orderedKeys.push(a.id)
  }
  if (!onlyAccount && rawByAccount.has(SEM_CONTA)) orderedKeys.push(SEM_CONTA)

  const groups: StatementGroup[] = []
  for (const key of orderedKeys) {
    const acc = key === SEM_CONTA ? undefined : accById.get(key)
    const opening = acc ? acc.openingBalance : 0
    const prior = input.priorByAccount[key] ?? 0
    const saldoAnterior = opening + prior

    const raw = (rawByAccount.get(key) ?? [])
      .filter((l) => matchesSearch(l.description, filters.search))
      // Ordena por data; no empate, realizadas antes das em aberto.
      .sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1
        if (a.kind !== b.kind) return a.kind === "realized" ? -1 : 1
        return 0
      })

    let saldoRealizado = saldoAnterior
    let saldoPrevisto = saldoAnterior
    const lines: StatementLine[] = raw.map((l) => {
      saldoPrevisto += l.signed
      if (l.kind === "realized") {
        saldoRealizado += l.signed
        return {
          id: l.id,
          kind: l.kind,
          date: l.date,
          description: l.description,
          situacao: "Realizado",
          signed: l.signed,
          saldoRealizado,
          saldoPrevisto,
        }
      }
      return {
        id: l.id,
        kind: l.kind,
        date: l.date,
        description: l.description,
        situacao: "Em aberto",
        signed: l.signed,
        saldoRealizado: null,
        saldoPrevisto,
      }
    })

    // Pula contas cadastradas totalmente vazias e sem saldo anterior (ruído),
    // a menos que o usuário tenha filtrado justamente por ela.
    if (!onlyAccount && lines.length === 0 && saldoAnterior === 0) continue

    groups.push({
      accountId: key === SEM_CONTA ? null : key,
      accountName: acc ? acc.name : "Sem conta",
      bank: acc?.bank ?? "",
      saldoAnterior,
      lines,
      saldoRealizadoFinal: saldoRealizado,
      saldoPrevistoFinal: saldoPrevisto,
    })
  }

  // --- KPIs (período + filtro de conta; independem da busca textual) ---
  const receitasRealizadas = sum(txns.filter((t) => t.type === "entrada").map((t) => t.amount))
  const despesasRealizadas = sum(txns.filter((t) => t.type === "saida").map((t) => t.amount))
  const receitasEmAberto = sum(openRec.map((r) => r.amount))
  const despesasEmAberto = sum(openPay.map((p) => p.amount))
  const totalPeriodo =
    receitasRealizadas + receitasEmAberto - (despesasRealizadas + despesasEmAberto)

  return {
    groups,
    kpis: {
      receitasRealizadas,
      despesasRealizadas,
      receitasEmAberto,
      despesasEmAberto,
      totalPeriodo,
    },
  }
}
