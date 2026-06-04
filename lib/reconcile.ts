// Motor de conciliação: cruza linhas do extrato OFX com transações reais
// do sistema e atribui um score de confiança. Puro e determinístico.

import type { OfxTransaction } from "@/lib/ofx"

// Transação do sistema, já com valor assinado (entrada > 0, saída < 0).
export interface SystemTxn {
  id: string
  date: string          // YYYY-MM-DD
  amount: number        // assinado: positivo = entrada, negativo = saída
  description: string
  categoryName: string
  reconciled: boolean
}

export type MatchLevel = "forte" | "provavel" | "fraco" | "nenhum"

export interface Match {
  ofx: OfxTransaction
  system: SystemTxn | null
  confidence: number    // 0-100
  level: MatchLevel
}

const STRONG_MIN = 85
const LIKELY_MIN = 60
// Abaixo deste valor consideramos que não há correspondência confiável.
const MATCH_FLOOR = 35

function levelFor(confidence: number, hasMatch: boolean): MatchLevel {
  if (!hasMatch || confidence < MATCH_FLOOR) return "nenhum"
  if (confidence >= STRONG_MIN) return "forte"
  if (confidence >= LIKELY_MIN) return "provavel"
  return "fraco"
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number)
  const [by, bm, bd] = b.split("-").map(Number)
  const da = Date.UTC(ay, am - 1, ad)
  const db = Date.UTC(by, bm - 1, bd)
  return Math.abs(Math.round((da - db) / 86400000))
}

const STOPWORDS = new Set([
  "de", "da", "do", "para", "com", "ted", "pix", "pgto", "pagto", "pagamento",
  "deb", "cred", "transferencia", "transf", "recebido", "enviado", "ref",
])

function tokens(s: string): string[] {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")   // remove acentos
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t))
}

// Similaridade de descrição: proporção de tokens em comum (Jaccard simples).
function textSimilarity(a: string, b: string): number {
  const ta = new Set(tokens(a))
  const tb = new Set(tokens(b))
  if (ta.size === 0 || tb.size === 0) return 0
  let inter = 0
  for (const t of ta) if (tb.has(t)) inter++
  const union = ta.size + tb.size - inter
  return union === 0 ? 0 : inter / union
}

/**
 * Calcula o score (0-100) entre uma linha do extrato e uma transação do
 * sistema. Componentes:
 *  - Valor (60 pts): tem que bater em sinal e magnitude. Sem isso o score
 *    é fortemente penalizado — valor é o sinal mais confiável.
 *  - Data (25 pts): mesmo dia vale tudo; decai até ~5 dias de diferença.
 *  - Descrição (15 pts): sobreposição de palavras.
 */
export function scorePair(ofx: OfxTransaction, sys: SystemTxn): number {
  // Valor
  const sameSign = (ofx.amount >= 0) === (sys.amount >= 0)
  const diff = Math.abs(Math.abs(ofx.amount) - Math.abs(sys.amount))
  let valueScore = 0
  if (sameSign) {
    if (diff < 0.01) valueScore = 60
    else {
      const base = Math.max(Math.abs(ofx.amount), Math.abs(sys.amount), 1)
      const rel = diff / base
      valueScore = rel <= 0.05 ? 60 * (1 - rel / 0.05) : 0
    }
  }

  // Data
  const dd = daysBetween(ofx.date, sys.date)
  const dateScore = dd === 0 ? 25 : dd >= 5 ? 0 : 25 * (1 - dd / 5)

  // Descrição
  const textScore = 15 * textSimilarity(ofx.memo, sys.description)

  return Math.round(valueScore + dateScore + textScore)
}

/**
 * Concilia o extrato contra as transações do sistema. Atribuição gulosa:
 * processa os pares por score decrescente e cada transação do sistema só
 * pode casar com uma linha do extrato. Transações já conciliadas
 * (reconciled) não entram como candidatas.
 */
export function reconcile(ofxList: OfxTransaction[], system: SystemTxn[]): Match[] {
  const candidates = system.filter((s) => !s.reconciled)

  // Gera todos os pares com score acima do piso.
  const pairs: { oi: number; si: number; score: number }[] = []
  ofxList.forEach((ofx, oi) => {
    candidates.forEach((sys, si) => {
      const score = scorePair(ofx, sys)
      if (score >= MATCH_FLOOR) pairs.push({ oi, si, score })
    })
  })
  pairs.sort((a, b) => b.score - a.score)

  const usedOfx = new Set<number>()
  const usedSys = new Set<number>()
  const assigned = new Map<number, { sys: SystemTxn; score: number }>()
  for (const p of pairs) {
    if (usedOfx.has(p.oi) || usedSys.has(p.si)) continue
    usedOfx.add(p.oi)
    usedSys.add(p.si)
    assigned.set(p.oi, { sys: candidates[p.si], score: p.score })
  }

  return ofxList.map((ofx, oi) => {
    const a = assigned.get(oi)
    const confidence = a ? a.score : 0
    return {
      ofx,
      system: a ? a.sys : null,
      confidence,
      level: levelFor(confidence, !!a),
    }
  })
}
