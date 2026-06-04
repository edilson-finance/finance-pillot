import { DateRange } from "./date-context"

/** Dias entre duas datas (inclusivo) */
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
