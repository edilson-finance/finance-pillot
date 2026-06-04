// Parser de extrato OFX (Open Financial Exchange).
// Funciona tanto com OFX 1.x (SGML, tags sem fechamento) quanto 2.x (XML).
// Puro: sem dependências, sem acesso a rede — testável isoladamente.

export interface OfxTransaction {
  fitid: string        // identificador único da linha no banco (FITID)
  date: string         // data do lançamento normalizada YYYY-MM-DD
  amount: number       // valor com sinal: positivo = crédito, negativo = débito
  memo: string         // descrição (MEMO ou NAME)
  type: string         // TRNTYPE bruto (DEBIT, CREDIT, PAYMENT, ...)
}

export interface OfxStatement {
  bankId: string | null      // BANKID
  accountId: string | null   // ACCTID (número da conta no banco)
  currency: string | null    // CURDEF
  transactions: OfxTransaction[]
}

// Extrai o valor de uma tag SGML/XML: o texto após `<TAG>` até o próximo
// `<` ou quebra de linha. Funciona com tags fechadas (`<TAG>v</TAG>`) e
// abertas (`<TAG>v\n`).
function tag(block: string, name: string): string {
  const re = new RegExp(`<${name}>([^<\r\n]*)`, "i")
  const m = re.exec(block)
  return m ? m[1].trim() : ""
}

// OFX usa datas como YYYYMMDD com sufixos opcionais de hora/fuso
// (ex.: 20260508120000.000[-3:GMT]). Pegamos só a parte da data.
function normalizeDate(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "")
  if (digits.length < 8) return ""
  const y = digits.slice(0, 4)
  const m = digits.slice(4, 6)
  const d = digits.slice(6, 8)
  return `${y}-${m}-${d}`
}

function parseAmount(raw: string): number {
  if (!raw) return 0
  // OFX usa ponto decimal, mas alguns bancos brasileiros exportam com vírgula.
  const normalized = raw.includes(",") && !raw.includes(".")
    ? raw.replace(",", ".")
    : raw.replace(/,/g, "")
  const n = Number(normalized)
  return Number.isFinite(n) ? n : 0
}

/**
 * Faz o parse de um arquivo OFX completo e devolve o extrato com suas
 * transações. Lança nada — em caso de conteúdo inválido devolve um extrato
 * vazio (transactions: []).
 */
export function parseOFX(content: string): OfxStatement {
  const text = content ?? ""

  const bankId = tag(text, "BANKID") || null
  const accountId = tag(text, "ACCTID") || null
  const currency = tag(text, "CURDEF") || null

  const transactions: OfxTransaction[] = []
  // Cada lançamento vive num bloco <STMTTRN>...</STMTTRN>.
  const re = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi
  let m: RegExpExecArray | null
  let fallbackSeq = 0
  while ((m = re.exec(text)) !== null) {
    const block = m[1]
    const date = normalizeDate(tag(block, "DTPOSTED"))
    const amount = parseAmount(tag(block, "TRNAMT"))
    const memo = tag(block, "MEMO") || tag(block, "NAME") || ""
    const type = (tag(block, "TRNTYPE") || "").toUpperCase()
    const fitid = tag(block, "FITID") || `auto-${date}-${amount}-${fallbackSeq++}`
    if (!date) continue
    transactions.push({ fitid, date, amount, memo, type })
  }

  return { bankId, accountId, currency, transactions }
}
