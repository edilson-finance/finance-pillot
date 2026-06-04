export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ")
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatCurrencyFull(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`
}

// Converte string em Date SEM deslocar o dia. Uma string "YYYY-MM-DD" é
// interpretada por `new Date()` como meia-noite UTC, que no fuso do Brasil
// (UTC-3) recua para o dia anterior. Forçamos a interpretação como horário
// local fixando o componente de tempo "T00:00:00".
function toLocalDate(date: string | Date): Date {
  if (date instanceof Date) return date
  // Apenas data (sem componente de hora): trata como horário local.
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split("-").map(Number)
    return new Date(y, m - 1, d)
  }
  return new Date(date)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("pt-BR").format(toLocalDate(date))
}

export function formatShortDate(date: string | Date): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(toLocalDate(date))
}
