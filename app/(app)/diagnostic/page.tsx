"use client"

import { useMemo, useState } from "react"
import { BrainCircuit, Loader2, Send, Sparkles } from "lucide-react"
import { useDateRange } from "@/lib/date-context"
import { generateKpis } from "@/lib/filtered-mock"
import { useCompany } from "@/lib/company-context"
import { formatCurrency } from "@/lib/utils"

const R = formatCurrency

type Message = {
  role: "user" | "assistant"
  content: string
}

function SectionText({ text }: { text: string }) {
  return (
    <div style={{ display: "grid", gap: "9px" }}>
      {text.split("\n").filter(line => line.trim() && line.trim() !== "---").map((rawLine, index) => {
        const line = rawLine.replace(/\*\*/g, "")
        if (line.startsWith("## ")) {
          return <strong key={index} style={{ fontSize: "15px", color: "var(--text-primary)" }}>{line.slice(3)}</strong>
        }
        if (line.startsWith("### ")) {
          return <strong key={index} style={{ fontSize: "12px", color: "var(--accent)", textTransform: "uppercase" }}>{line.slice(4)}</strong>
        }
        if (line.startsWith("- ")) {
          return <div key={index} style={{ fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: 1.55, paddingLeft: "10px" }}>• {line.slice(2)}</div>
        }
        return <p key={index} style={{ margin: 0, fontSize: "12.8px", color: "var(--text-secondary)", lineHeight: 1.7 }}>{line}</p>
      })}
    </div>
  )
}

function buildBrief(kpis: ReturnType<typeof generateKpis>, profileLabel: string, focus: string, revenueWord: string, period: string) {
  return `## Leitura inicial do CFO AI

### O que está acontecendo
No período ${period}, a empresa gerou ${R(kpis.faturamento)} em ${revenueWord}, com lucro líquido de ${R(kpis.lucroLiquido)} e margem líquida de ${kpis.lucroMargin}%. O caixa atual é ${R(kpis.saldoAtual)}, mas existe pressão de recebimento: ${R(kpis.aReceberVencido)} vencidos e inadimplência de ${kpis.inadimplencia}%.

### Leitura estratégica
Para uma empresa de perfil ${profileLabel}, a análise mais importante agora é ${focus}. O ponto central não é apenas vender mais, mas transformar receita em caixa previsível e lucro sustentável.

### Risco
Se a inadimplência continuar alta, a empresa pode crescer no faturamento e piorar no caixa. Isso reduz poder de negociação, aumenta dependência de capital de giro e comprime a margem.

### O que fazer agora
- Cobrar os maiores inadimplentes com régua clara de prazo e responsável.
- Confirmar entradas dos próximos 30 dias antes de assumir novas saídas.
- Separar entradas por categoria, produto, serviço, cliente e recorrência.
- Revisar saídas fixas e despesas financeiras que pressionam margem.

### Prioridade
Proteger caixa, margem e previsibilidade antes de acelerar crescimento.`
}

const questions = [
  "Qual é o maior risco financeiro da empresa hoje?",
  "O que eu faria nos próximos 30 dias para melhorar caixa?",
  "Minha empresa está lucrando ou só faturando?",
  "Onde estão os maiores vazamentos de dinheiro?",
  "Como reduzir dependência de poucos clientes?",
]

export default function DiagnosticPage() {
  const { range } = useDateRange()
  const { companyProfile } = useCompany()
  const kpis = generateKpis(range)
  const initialMessage = useMemo(
    () => buildBrief(kpis, companyProfile.label, companyProfile.reportFocus, companyProfile.language.revenue, range.label),
    [companyProfile.label, companyProfile.language.revenue, companyProfile.reportFocus, kpis, range.label],
  )

  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: initialMessage }])
  const [question, setQuestion] = useState("")
  const [loading, setLoading] = useState(false)

  const context = {
    companyProfile: companyProfile.label,
    period: range.label,
    focus: companyProfile.reportFocus,
    language: companyProfile.language,
    indicators: companyProfile.indicators,
    benchmarks: companyProfile.benchmarks,
    kpis: {
      saldoAtual: R(kpis.saldoAtual),
      saldoProjetado: R(kpis.saldoProjetado),
      faturamento: R(kpis.faturamento),
      lucroLiquido: R(kpis.lucroLiquido),
      lucroMargin: `${kpis.lucroMargin}%`,
      margemContribuicao: `${kpis.margemContribuicao}%`,
      ebitda: R(kpis.ebitda),
      aReceber: R(kpis.aReceber),
      aReceberVencido: R(kpis.aReceberVencido),
      aPagar: R(kpis.aPagar),
      aPagarVencido: R(kpis.aPagarVencido),
      inadimplencia: `${kpis.inadimplencia}%`,
      capitalGiro: R(kpis.capitalGiro),
      pontoEquilibrio: R(kpis.pontoEquilibrio),
    },
  }

  async function askCfo(value = question) {
    const clean = value.trim()
    if (!clean || loading) return

    setQuestion("")
    setLoading(true)
    setMessages(prev => [...prev, { role: "user", content: clean }])

    try {
      const response = await fetch("/api/cfo-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: clean, context }),
      })
      const data = await response.json()
      setMessages(prev => [...prev, { role: "assistant", content: String(data.answer ?? "") }])
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "## Não consegui concluir a análise agora\n\nRevise caixa projetado, inadimplência, margem líquida e concentração de receita antes de assumir novas despesas. Esses quatro pontos mostram se a empresa está crescendo com saúde ou apenas aumentando movimento financeiro.",
      }])
    } finally {
      setLoading(false)
    }
  }

  const cards = [
    { label: "Caixa projetado", value: R(kpis.saldoProjetado), detail: "Proteção de liquidez nos próximos 30 dias", color: "var(--accent)" },
    { label: "Inadimplência", value: `${kpis.inadimplencia}%`, detail: `${R(kpis.aReceberVencido)} vencidos`, color: "var(--danger)" },
    { label: "Margem líquida", value: `${kpis.lucroMargin}%`, detail: "Lucro real depois da operação", color: "var(--warning)" },
    { label: "Capital de giro", value: R(kpis.capitalGiro), detail: "Fôlego para sustentar crescimento", color: "var(--success)" },
  ]

  return (
    <div style={{ padding: "22px", maxWidth: "1500px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "18px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "12px", background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BrainCircuit size={20} style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 900, color: "var(--text-primary)" }}>CFO AI</h1>
              <div style={{ marginTop: "2px", fontSize: "11px", color: "var(--text-muted)" }}>Diretor Financeiro Estratégico virtual · {range.label}</div>
            </div>
          </div>
          <p style={{ margin: "10px 0 0", maxWidth: "760px", fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: 1.65 }}>
            Analisa caixa, lucro, margem, inadimplência, capital de giro e crescimento para transformar os números em decisão empresarial.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "7px", padding: "8px 11px", border: "1px solid var(--border)", borderRadius: "999px", background: "var(--bg-secondary)", fontSize: "11px", color: "var(--text-secondary)", flexShrink: 0 }}>
          <Sparkles size={14} style={{ color: "var(--accent)" }} />
          {companyProfile.icon} {companyProfile.label}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "12px", marginBottom: "16px" }}>
        {cards.map(card => (
          <div key={card.label} style={{ border: `1px solid ${card.color}30`, borderRadius: "14px", background: "var(--bg-secondary)", padding: "15px" }}>
            <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 900, textTransform: "uppercase" }}>{card.label}</div>
            <div style={{ marginTop: "8px", fontSize: "22px", lineHeight: 1, fontWeight: 900, color: card.color }}>{card.value}</div>
            <div style={{ marginTop: "7px", fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.45 }}>{card.detail}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.45fr) 380px", gap: "16px", alignItems: "start" }}>
        <section style={{ border: "1px solid var(--border)", borderRadius: "16px", background: "var(--bg-secondary)", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", padding: "15px 18px", borderBottom: "1px solid var(--border)", background: "var(--bg-tertiary)" }}>
            <div>
              <strong style={{ fontSize: "14px", color: "var(--text-primary)" }}>Sala do CFO</strong>
              <div style={{ marginTop: "2px", fontSize: "11px", color: "var(--text-muted)" }}>Pergunte sobre riscos, caixa, lucro, margem, custos e decisões</div>
            </div>
            <span style={{ padding: "3px 8px", borderRadius: "999px", background: "var(--success-soft)", color: "var(--success)", fontSize: "10px", fontWeight: 900 }}>Análise estratégica</span>
          </div>

          <div style={{ minHeight: "520px", padding: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
            {messages.map((message, index) => (
              <div key={index} style={{ alignSelf: message.role === "user" ? "flex-end" : "stretch", maxWidth: message.role === "user" ? "78%" : "100%" }}>
                <div style={{
                  padding: message.role === "user" ? "11px 13px" : "16px",
                  borderRadius: message.role === "user" ? "14px 14px 4px 14px" : "14px",
                  background: message.role === "user" ? "var(--accent)" : "var(--bg-tertiary)",
                  border: message.role === "user" ? "none" : "1px solid var(--border)",
                  color: message.role === "user" ? "#fff" : "var(--text-primary)",
                }}>
                  {message.role === "user" ? (
                    <div style={{ fontSize: "13px", lineHeight: 1.55 }}>{message.content}</div>
                  ) : (
                    <SectionText text={message.content} />
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-muted)", fontSize: "12px" }}>
                <Loader2 size={14} />
                CFO AI analisando causa raiz, risco e plano de ação...
              </div>
            )}
          </div>

          <div style={{ padding: "14px 18px", borderTop: "1px solid var(--border)", background: "var(--bg-tertiary)" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                value={question}
                onChange={event => setQuestion(event.target.value)}
                onKeyDown={event => { if (event.key === "Enter") askCfo() }}
                placeholder="Pergunte: o que está impedindo minha empresa de gerar mais caixa?"
                style={{ flex: 1, minWidth: 0, border: "1px solid var(--border)", borderRadius: "10px", background: "var(--bg-secondary)", color: "var(--text-primary)", padding: "11px 13px", outline: "none", fontSize: "13px" }}
              />
              <button onClick={() => askCfo()} disabled={loading} style={{ width: "44px", border: "none", borderRadius: "10px", background: loading ? "var(--bg-elevated)" : "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: loading ? "not-allowed" : "pointer" }}>
                {loading ? <Loader2 size={16} /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </section>

        <aside style={{ display: "grid", gap: "14px" }}>
          <div style={{ border: "1px solid var(--border)", borderRadius: "16px", background: "var(--bg-secondary)", padding: "16px" }}>
            <strong style={{ fontSize: "13px", color: "var(--text-primary)" }}>Perguntas inteligentes</strong>
            <div style={{ display: "grid", gap: "8px", marginTop: "12px" }}>
              {questions.map(item => (
                <button key={item} onClick={() => askCfo(item)} style={{ textAlign: "left", padding: "10px 11px", border: "1px solid var(--border)", borderRadius: "10px", background: "var(--bg-tertiary)", color: "var(--text-secondary)", fontSize: "12px", lineHeight: 1.45, cursor: "pointer" }}>
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div style={{ border: "1px solid var(--border)", borderRadius: "16px", background: "var(--bg-secondary)", padding: "16px" }}>
            <strong style={{ fontSize: "13px", color: "var(--text-primary)" }}>Dados lidos pelo CFO AI</strong>
            <div style={{ marginTop: "10px" }}>
              {Object.entries(context.kpis).slice(0, 8).map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: "10px", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: "11.5px", color: "var(--text-secondary)" }}>{label}</span>
                  <strong style={{ fontSize: "12px", color: "var(--text-primary)", textAlign: "right" }}>{value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div style={{ border: "1px solid rgba(79,70,229,0.25)", borderRadius: "16px", background: "linear-gradient(135deg, rgba(79,70,229,0.12), rgba(16,185,129,0.08))", padding: "16px" }}>
            <strong style={{ fontSize: "13px", color: "var(--text-primary)" }}>Como a resposta se adapta</strong>
            <p style={{ margin: "8px 0 0", fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.65 }}>
              O CFO AI usa o perfil econômico, os indicadores mais relevantes e os dados do período para mudar linguagem, diagnóstico e prioridades.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
