/**
 * Dados mock filtrados por período.
 * Gera números plausíveis proporcionais ao range selecionado.
 */

import { DateRange } from "./date-context"

/** Dias entre duas datas */
export function daysBetween(start: Date, end: Date) {
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1)
}

/** Fator de escala em relação a um mês (30 dias) */
export function periodFactor(range: DateRange) {
  const days = daysBetween(range.start, range.end)
  return days / 30
}

/** Label do agrupamento temporal adequado ao período */
export function groupLabel(range: DateRange): "hora" | "dia" | "semana" | "mes" {
  const days = daysBetween(range.start, range.end)
  if (days <= 1)  return "hora"
  if (days <= 14) return "dia"
  if (days <= 90) return "semana"
  return "mes"
}

/** Formata data como rótulo de eixo */
function fmtAxis(d: Date, group: ReturnType<typeof groupLabel>): string {
  if (group === "hora") {
    return `${d.getHours()}h`
  }
  if (group === "dia") {
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
  }
  if (group === "semana") {
    return `S${Math.ceil(d.getDate() / 7)} ${d.toLocaleDateString("pt-BR", { month: "short" })}`
  }
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
}

/** Gera série de receita/despesa ajustada ao período */
export function generateRevenueSeries(range: DateRange) {
  const days = daysBetween(range.start, range.end)
  const group = groupLabel(range)

  // Base mensal
  const baseReceita = 312000
  const baseDespesa = 288000

  let points: number
  if (group === "hora")  points = 24
  else if (group === "dia") points = days
  else if (group === "semana") points = Math.ceil(days / 7)
  else points = Math.ceil(days / 30)

  const series = []
  const start = new Date(range.start)

  for (let i = 0; i < points; i++) {
    const d = new Date(start)
    if (group === "hora") d.setHours(i)
    else if (group === "dia") d.setDate(start.getDate() + i)
    else if (group === "semana") d.setDate(start.getDate() + i * 7)
    else d.setMonth(start.getMonth() + i)

    const noise = 0.8 + Math.random() * 0.4
    const scale = points === 0 ? 1 : 1 / points

    const receita = Math.round(baseReceita * scale * noise)
    const despesa = Math.round(baseDespesa * scale * noise * 0.92)

    series.push({
      label: fmtAxis(d, group),
      receita,
      despesa,
      liquido: receita - despesa,
    })
  }

  return series
}

/** KPIs escalados pelo período */
export function generateKpis(range: DateRange) {
  const f = periodFactor(range)
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

  return {
    faturamento:        Math.round(312000 * f),
    despesaTotal:       Math.round(288000 * f),
    lucroLiquido:       Math.round(18400  * f),
    lucroMargin:        5.9,
    aReceber:           Math.round(113500 * clamp(f, 0.5, 2)),
    aPagar:             Math.round(103200 * clamp(f, 0.5, 2)),
    saldoAtual:         284750,
    saldoProjetado:     312400,
    inadimplencia:      19.9,
    margemContribuicao: 37.5,
    ebitda:             Math.round(61404 * f),
    capitalGiro:        181550,
    ticketMedio:        24600,
    pontoEquilibrio:    Math.round(267000 * clamp(f, 0.8, 1.2)),
    faturamentoVar:     8.4,
    aReceberVencido:    28700,
    aPagarVencido:      12400,
    days:               daysBetween(range.start, range.end),
    group:              groupLabel(range),
  }
}

/** Inadimplentes filtrados — para a tela de inadimplentes */
export const inadimplentes = [
  {
    id:"1", cliente:"Construtora Beta Ltda", cnpj:"12.345.678/0001-90",
    descricao:"Medição 12 — Obra 07", vencimento:"2026-04-30", dias:9,
    valor:150000, statusCobranca:"aguardando", ultimoContato:"05/05/2026",
    tentativas:2, telefone:"(11) 98765-4321", whatsapp:"11987654321",
  },
  {
    id:"2", cliente:"RJ Incorporadora Ltda", cnpj:"56.789.012/0001-34",
    descricao:"Projeto estrutural fase 1", vencimento:"2026-04-15", dias:24,
    valor:14000, statusCobranca:"prometeu_pagar", ultimoContato:"07/05/2026",
    tentativas:4, telefone:"(21) 93456-7890", whatsapp:"21934567890",
  },
  {
    id:"3", cliente:"Construtora Beta Ltda", cnpj:"12.345.678/0001-90",
    descricao:"Medição 11 — Obra 07", vencimento:"2026-03-31", dias:39,
    valor:28700, statusCobranca:"negociando", ultimoContato:"04/05/2026",
    tentativas:6, telefone:"(11) 98765-4321", whatsapp:"11987654321",
  },
  {
    id:"4", cliente:"Incorporadora Sul Ltda", cnpj:"77.888.999/0001-11",
    descricao:"Consultoria mês de março", vencimento:"2026-04-05", dias:34,
    valor:8200, statusCobranca:"sem_resposta", ultimoContato:"28/04/2026",
    tentativas:3, telefone:"(48) 91234-5678", whatsapp:"48912345678",
  },
  {
    id:"5", cliente:"Engenharia Rápida S.A.", cnpj:"33.222.111/0001-00",
    descricao:"Laudo técnico estrutural", vencimento:"2026-03-20", dias:50,
    valor:5400, statusCobranca:"juridico", ultimoContato:"01/05/2026",
    tentativas:8, telefone:"(11) 92222-1111", whatsapp:"11922221111",
  },
]
