"use client"

import { useEffect, useRef, useState } from "react"
import { Upload, CheckCircle2, AlertTriangle, HelpCircle, FileText, X, Loader2, Building2 } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { parseOFX } from "@/lib/ofx"
import { reconcile, type Match } from "@/lib/reconcile"
import { fetchAccounts, fetchSystemContext, type BankAccount } from "@/lib/reconcile-data"
import { confirmReconciliation, createFromStatement } from "./actions"

const R = formatCurrency

const nivelConfig = {
  forte:    { label: "Correspondência forte", color: "var(--success)", bg: "var(--success-soft)", icon: CheckCircle2 },
  provavel: { label: "Provável — revisar",     color: "var(--warning)", bg: "var(--warning-soft)", icon: AlertTriangle },
  fraco:    { label: "Fraca — verificar",      color: "#F97316",        bg: "rgba(249,115,22,0.12)", icon: AlertTriangle },
  nenhum:   { label: "Não encontrado — criar", color: "var(--danger)",  bg: "var(--danger-soft)",  icon: HelpCircle },
}

// Desloca uma data YYYY-MM-DD por N dias (mantendo formato local).
function shiftDate(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number)
  const dt = new Date(y, m - 1, d + days)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`
}

type RowStatus = "pending" | "confirmed" | "ignored" | "already"
interface RowState { status: RowStatus; busy?: boolean; error?: string }

export default function ReconciliationPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [accountId, setAccountId] = useState("")
  const [file, setFile] = useState<{ name: string; size: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [rows, setRows] = useState<Record<string, RowState>>({})

  useEffect(() => { fetchAccounts().then(setAccounts) }, [])

  async function handleFile(f: File | undefined) {
    if (!f) return
    if (!accountId) { setError("Selecione a conta bancária do extrato antes de importar."); return }
    setError(null)
    setLoading(true)
    setMatches([])
    setRows({})
    setFile({ name: f.name, size: `${(f.size / 1024).toFixed(1)} KB` })

    try {
      const text = await f.text()
      const statement = parseOFX(text)
      if (statement.transactions.length === 0) {
        setError("Nenhuma transação encontrada no arquivo OFX. Verifique se o arquivo é um extrato válido.")
        setLoading(false)
        return
      }

      // Janela de datas do extrato, com folga de 3 dias para capturar
      // lançamentos do sistema postados em data próxima.
      const dates = statement.transactions.map((t) => t.date).sort()
      const start = shiftDate(dates[0], -3)
      const end = shiftDate(dates[dates.length - 1], 3)

      const { txns, reconciledFitids } = await fetchSystemContext(accountId, start, end)
      const result = reconcile(statement.transactions, txns)
      setMatches(result)

      const initial: Record<string, RowState> = {}
      for (const m of result) {
        initial[m.ofx.fitid] = reconciledFitids.has(m.ofx.fitid)
          ? { status: "already" }
          : { status: "pending" }
      }
      setRows(initial)
    } catch (e: any) {
      setError(`Falha ao processar o arquivo: ${e?.message ?? "erro desconhecido"}`)
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setFile(null); setMatches([]); setRows({}); setError(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  function setRow(fitid: string, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [fitid]: { ...prev[fitid], ...patch } }))
  }

  async function onConfirm(m: Match) {
    if (!m.system) return
    setRow(m.ofx.fitid, { busy: true, error: undefined })
    const res = await confirmReconciliation(m.system.id, m.ofx.fitid)
    if (res.error) setRow(m.ofx.fitid, { busy: false, error: res.error })
    else setRow(m.ofx.fitid, { busy: false, status: "confirmed" })
  }

  async function onCreate(m: Match) {
    setRow(m.ofx.fitid, { busy: true, error: undefined })
    const res = await createFromStatement({
      accountId,
      date: m.ofx.date,
      amount: m.ofx.amount,
      description: m.ofx.memo,
      fitid: m.ofx.fitid,
    })
    if (res.error) setRow(m.ofx.fitid, { busy: false, error: res.error })
    else setRow(m.ofx.fitid, { busy: false, status: "confirmed" })
  }

  // Resumo (conta apenas linhas ainda visíveis / não ignoradas).
  // Cada linha entra em UMA única categoria para o total nunca ficar negativo:
  // conciliada (confirmada/criada) tem prioridade; depois "sem correspondência"
  // (nível "nenhum" ainda não tratado); o restante é "para revisar".
  const visible = matches.filter((m) => rows[m.ofx.fitid]?.status !== "ignored")
  const confirmados = visible.filter((m) => {
    const s = rows[m.ofx.fitid]?.status
    return s === "confirmed" || s === "already"
  }).length
  const semCorr = visible.filter((m) => {
    const s = rows[m.ofx.fitid]?.status
    return m.level === "nenhum" && s !== "confirmed" && s !== "already"
  }).length
  const revisar = visible.length - confirmados - semCorr

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.3px" }}>Conciliação Bancária</h1>
        <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>Importe o extrato OFX do banco e concilie com os lançamentos do sistema</p>
      </div>

      {/* Conta + upload */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 12px" }}>
          <Building2 size={16} style={{ color: "var(--text-muted)" }} />
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            style={{ background: "transparent", border: "none", color: "var(--text-primary)", fontSize: "13px", fontFamily: "inherit", cursor: "pointer", outline: "none", minWidth: "180px" }}>
            <option value="">Selecione a conta do extrato…</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}{a.bank ? ` · ${a.bank}` : ""}</option>
            ))}
          </select>
        </div>
      </div>

      <input ref={fileRef} type="file" accept=".ofx,.OFX,.qfx,.QFX" style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files?.[0])} />

      {error && (
        <div style={{ background: "var(--danger-soft)", border: "1px solid var(--danger)40", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", fontSize: "12px", color: "var(--danger)" }}>
          {error}
        </div>
      )}

      {file ? (
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "10px", padding: "16px 20px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "14px" }}>
          {loading ? <Loader2 size={22} className="fp-spin" style={{ color: "var(--accent)", flexShrink: 0 }} /> : <FileText size={22} style={{ color: "var(--success)", flexShrink: 0 }} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
              {loading ? "Processando extrato…" : `${file.size} · ${matches.length} transações · ${confirmados} conciliadas · ${revisar} para revisar · ${semCorr} sem correspondência`}
            </div>
          </div>
          <button onClick={reset} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--text-muted)", flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>
      ) : (
        <div style={{ background: "var(--bg-secondary)", border: "2px dashed var(--border)", borderRadius: "10px", padding: "24px", marginBottom: "20px", textAlign: "center" }}
          onDragOver={(e) => { e.preventDefault(); (e.currentTarget as any).style.borderColor = "var(--accent)" }}
          onDragLeave={(e) => { (e.currentTarget as any).style.borderColor = "var(--border)" }}
          onDrop={(e) => { e.preventDefault(); (e.currentTarget as any).style.borderColor = "var(--border)"; handleFile(e.dataTransfer.files?.[0]) }}>
          <Upload size={24} style={{ color: "var(--text-muted)", marginBottom: "8px" }} />
          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>Importar extrato OFX</div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "12px" }}>
            Arraste o arquivo aqui ou exporte o extrato do seu banco em formato OFX
          </div>
          <button onClick={() => { if (!accountId) { setError("Selecione a conta bancária do extrato antes de importar."); return } fileRef.current?.click() }}
            style={{ padding: "8px 20px", background: "var(--accent)", border: "none", borderRadius: "8px", fontSize: "12px", color: "#fff", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Selecionar arquivo OFX
          </button>
        </div>
      )}

      {/* Legenda */}
      {matches.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "16px" }}>
          {Object.entries(nivelConfig).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: v.color }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: v.color, display: "inline-block" }} />
              {v.label} {k !== "nenhum" && `(${k === "forte" ? "85-100%" : k === "provavel" ? "60-84%" : "<60%"})`}
            </div>
          ))}
        </div>
      )}

      {/* Correspondências */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {visible.map((m) => {
          const conf = nivelConfig[m.level]
          const Icon = conf.icon
          const st = rows[m.ofx.fitid] ?? { status: "pending" as RowStatus }
          const done = st.status === "confirmed" || st.status === "already"
          return (
            <div key={m.ofx.fitid} style={{ background: "var(--bg-secondary)", border: `1px solid ${done ? "var(--success)" : conf.color}30`, borderRadius: "10px", padding: "16px", display: "grid", gridTemplateColumns: "80px 1fr auto 1fr 130px", gap: "16px", alignItems: "center", opacity: done ? 0.85 : 1 }}>
              {/* Confiança */}
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "18px", fontWeight: 800, color: conf.color }}>{m.confidence > 0 ? `${m.confidence}%` : "—"}</div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>confiança</div>
              </div>

              {/* Extrato */}
              <div style={{ background: "var(--bg-tertiary)", borderRadius: "8px", padding: "10px 12px" }}>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase" }}>Extrato bancário</div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "3px" }}>{m.ofx.memo || "(sem descrição)"}</div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{formatDate(m.ofx.date)}</span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: m.ofx.amount >= 0 ? "var(--success)" : "var(--danger)" }}>
                    {m.ofx.amount >= 0 ? "+" : "-"}{R(Math.abs(m.ofx.amount))}
                  </span>
                </div>
              </div>

              {/* Ícone */}
              <Icon size={18} style={{ color: done ? "var(--success)" : conf.color }} />

              {/* Sistema */}
              <div style={{ background: "var(--bg-tertiary)", borderRadius: "8px", padding: "10px 12px" }}>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase" }}>Lançamento no sistema</div>
                {m.system ? (
                  <>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.system.description || "(sem descrição)"}</div>
                    <span style={{ fontSize: "11px", background: "var(--bg-elevated)", color: "var(--text-muted)", padding: "1px 7px", borderRadius: "4px", border: "1px solid var(--border)" }}>{m.system.categoryName}</span>
                  </>
                ) : (
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>Nenhum lançamento encontrado</div>
                )}
              </div>

              {/* Ações */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {st.status === "already" ? (
                  <span style={{ padding: "6px 12px", background: "var(--success-soft)", border: "1px solid var(--success)40", borderRadius: "6px", fontSize: "11px", color: "var(--success)", fontWeight: 700, textAlign: "center" }}>Já conciliado</span>
                ) : done ? (
                  <span style={{ padding: "6px 12px", background: "var(--success-soft)", border: "1px solid var(--success)40", borderRadius: "6px", fontSize: "11px", color: "var(--success)", fontWeight: 700, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                    <CheckCircle2 size={12} /> Conciliado
                  </span>
                ) : (
                  <>
                    {m.system ? (
                      <button disabled={st.busy} onClick={() => onConfirm(m)}
                        style={{ padding: "6px 12px", background: "var(--success-soft)", border: "1px solid var(--success)40", borderRadius: "6px", fontSize: "11px", color: "var(--success)", fontWeight: 600, cursor: st.busy ? "default" : "pointer", fontFamily: "inherit", opacity: st.busy ? 0.6 : 1 }}>
                        {st.busy ? "Salvando…" : "Confirmar"}
                      </button>
                    ) : (
                      <button disabled={st.busy} onClick={() => onCreate(m)}
                        style={{ padding: "6px 12px", background: "var(--accent-soft)", border: "1px solid var(--accent)40", borderRadius: "6px", fontSize: "11px", color: "var(--accent)", fontWeight: 600, cursor: st.busy ? "default" : "pointer", fontFamily: "inherit", opacity: st.busy ? 0.6 : 1 }}>
                        {st.busy ? "Criando…" : "Criar lançamento"}
                      </button>
                    )}
                    <button disabled={st.busy} onClick={() => setRow(m.ofx.fitid, { status: "ignored" })}
                      style={{ padding: "6px 12px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "11px", color: "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>
                      Ignorar
                    </button>
                  </>
                )}
                {st.error && <span style={{ fontSize: "10px", color: "var(--danger)" }}>{st.error}</span>}
              </div>
            </div>
          )
        })}
      </div>

      {matches.length > 0 && visible.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)", fontSize: "13px" }}>
          Todas as linhas foram tratadas.
        </div>
      )}
    </div>
  )
}
