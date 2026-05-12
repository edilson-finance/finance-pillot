"use client"

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine,
} from "recharts"
import { useState } from "react"
import {
  Users, Package, TrendingDown, TrendingUp, DollarSign, Percent,
  Calculator, ChevronRight, AlertTriangle, CheckCircle, Minus,
} from "lucide-react"
import { kpiData } from "@/lib/mock-data"
import { formatCurrency } from "@/lib/utils"

const R = formatCurrency

type Simulacao = {
  tipo: string
  label: string
  descricao: string
  icon: typeof Users
  color: string
  campos: { key: string; label: string; tipo: "currency" | "percent" | "number"; placeholder: string; default: number }[]
}

const simulacoes: Simulacao[] = [
  {
    tipo: "contratacao",
    label: "Nova Contratação",
    descricao: "Impacto de contratar um ou mais colaboradores",
    icon: Users,
    color: "var(--purple)",
    campos: [
      { key: "salario", label: "Salário bruto mensal", tipo: "currency", placeholder: "R$ 0", default: 8000 },
      { key: "encargos", label: "Encargos estimados (%)", tipo: "percent", placeholder: "70%", default: 70 },
      { key: "quantidade", label: "Quantidade de colaboradores", tipo: "number", placeholder: "1", default: 1 },
    ],
  },
  {
    tipo: "equipamento",
    label: "Compra de Equipamento",
    descricao: "Impacto de adquirir um equipamento ou ativo",
    icon: Package,
    color: "var(--info)",
    campos: [
      { key: "valor", label: "Valor do equipamento", tipo: "currency", placeholder: "R$ 0", default: 80000 },
      { key: "entrada", label: "Entrada (%)", tipo: "percent", placeholder: "30%", default: 30 },
      { key: "parcelas", label: "Número de parcelas", tipo: "number", placeholder: "24", default: 24 },
      { key: "taxa", label: "Taxa de juros mensal (%)", tipo: "percent", placeholder: "1.5%", default: 1.5 },
    ],
  },
  {
    tipo: "desconto",
    label: "Desconto para Cliente",
    descricao: "Impacto de oferecer desconto em recebíveis",
    icon: Percent,
    color: "var(--warning)",
    campos: [
      { key: "valor", label: "Valor do recebível", tipo: "currency", placeholder: "R$ 0", default: 50000 },
      { key: "desconto", label: "Desconto oferecido (%)", tipo: "percent", placeholder: "5%", default: 5 },
    ],
  },
  {
    tipo: "aumento_receita",
    label: "Aumento de Receita",
    descricao: "Impacto de fechar um novo contrato ou cliente",
    icon: TrendingUp,
    color: "var(--success)",
    campos: [
      { key: "valor", label: "Receita adicional mensal", tipo: "currency", placeholder: "R$ 0", default: 50000 },
      { key: "custo", label: "Custo variável da receita (%)", tipo: "percent", placeholder: "60%", default: 60 },
    ],
  },
  {
    tipo: "perda_cliente",
    label: "Perda de Cliente",
    descricao: "Impacto de perder um cliente importante",
    icon: TrendingDown,
    color: "var(--danger)",
    campos: [
      { key: "receita", label: "Receita mensal do cliente", tipo: "currency", placeholder: "R$ 0", default: 150000 },
      { key: "custo_variavel", label: "Custo variável associado (%)", tipo: "percent", placeholder: "55%", default: 55 },
    ],
  },
  {
    tipo: "financiamento",
    label: "Novo Financiamento",
    descricao: "Impacto de contratar um empréstimo ou crédito",
    icon: DollarSign,
    color: "var(--accent)",
    campos: [
      { key: "valor", label: "Valor do financiamento", tipo: "currency", placeholder: "R$ 0", default: 200000 },
      { key: "parcelas", label: "Número de parcelas", tipo: "number", placeholder: "36", default: 36 },
      { key: "taxa", label: "Taxa de juros mensal (%)", tipo: "percent", placeholder: "1.8%", default: 1.8 },
    ],
  },
]

function calcularImpacto(tipo: string, valores: Record<string, number>) {
  const r = kpiData.faturamento
  const despesa = kpiData.aPagar / 1 // mensal
  const caixa = kpiData.saldoAtual
  const lucro = kpiData.lucroLiquido
  const margem = kpiData.lucroMargin

  switch (tipo) {
    case "contratacao": {
      const custo = valores.salario * (1 + valores.encargos / 100) * valores.quantidade
      return {
        impactoCaixa: -custo,
        impactoMargem: -(custo / r * 100),
        impactoLucro: -custo,
        payback: null,
        risco: custo > r * 0.1 ? "alto" : custo > r * 0.05 ? "medio" : "baixo",
        sustentavel: custo < lucro,
        descricao: `Custo total mensal de ${R(custo)}. ${custo > lucro ? "Torna o resultado negativo." : "Dentro da capacidade de pagamento."}`,
      }
    }
    case "equipamento": {
      const entrada = valores.valor * (valores.entrada / 100)
      const parcela = ((valores.valor - entrada) * (valores.taxa / 100)) / (1 - Math.pow(1 + valores.taxa / 100, -valores.parcelas))
      return {
        impactoCaixa: -entrada,
        impactoMargem: -(parcela / r * 100),
        impactoLucro: -parcela,
        payback: Math.ceil(valores.valor / Math.max(lucro, 1)),
        risco: entrada > caixa * 0.3 ? "alto" : "baixo",
        sustentavel: parcela < lucro,
        descricao: `Entrada de ${R(entrada)}. Parcela mensal de ${R(Math.round(parcela))}. Payback estimado em ${Math.ceil(valores.valor / Math.max(lucro * 12, 1))} anos.`,
      }
    }
    case "desconto": {
      const perdaLiquida = valores.valor * (valores.desconto / 100)
      return {
        impactoCaixa: valores.valor * (1 - valores.desconto / 100) - valores.valor,
        impactoMargem: -(perdaLiquida / r * 100),
        impactoLucro: -perdaLiquida,
        payback: null,
        risco: perdaLiquida > r * 0.05 ? "medio" : "baixo",
        sustentavel: true,
        descricao: `Desconto de ${R(perdaLiquida)} resulta em recebimento de ${R(valores.valor * (1 - valores.desconto / 100))}.`,
      }
    }
    case "aumento_receita": {
      const lucroAdicional = valores.valor * (1 - valores.custo / 100)
      return {
        impactoCaixa: +valores.valor,
        impactoMargem: +(lucroAdicional / r * 100),
        impactoLucro: +lucroAdicional,
        payback: null,
        risco: "positivo",
        sustentavel: true,
        descricao: `Margem de contribuição adicional de ${R(Math.round(lucroAdicional))} (${(100 - valores.custo).toFixed(0)}%).`,
      }
    }
    case "perda_cliente": {
      const perdaLiquida = valores.receita * (1 - valores.custo_variavel / 100)
      return {
        impactoCaixa: -valores.receita,
        impactoMargem: -(perdaLiquida / r * 100),
        impactoLucro: -perdaLiquida,
        payback: null,
        risco: valores.receita > r * 0.3 ? "critico" : "alto",
        sustentavel: lucro - perdaLiquida > 0,
        descricao: `Perda de margem de contribuição de ${R(Math.round(perdaLiquida))}. ${lucro - perdaLiquida < 0 ? "Resultado fica negativo." : "Empresa mantém lucro reduzido."}`,
      }
    }
    case "financiamento": {
      const parcela = (valores.valor * (valores.taxa / 100)) / (1 - Math.pow(1 + valores.taxa / 100, -valores.parcelas))
      return {
        impactoCaixa: +valores.valor,
        impactoMargem: -(parcela / r * 100),
        impactoLucro: -parcela,
        payback: null,
        risco: parcela > lucro * 0.5 ? "alto" : "medio",
        sustentavel: parcela < lucro,
        descricao: `Parcela mensal de ${R(Math.round(parcela))}. Total a pagar: ${R(Math.round(parcela * valores.parcelas))}.`,
      }
    }
    default:
      return { impactoCaixa: 0, impactoMargem: 0, impactoLucro: 0, payback: null, risco: "baixo", sustentavel: true, descricao: "" }
  }
}

export default function SimuladorPage() {
  const [simAtiva, setSimAtiva] = useState(simulacoes[0])
  const [valores, setValores] = useState<Record<string, number>>({})

  const getValor = (campo: typeof simAtiva.campos[0]) => valores[campo.key] ?? campo.default

  const impacto = calcularImpacto(simAtiva.tipo, Object.fromEntries(simAtiva.campos.map(c => [c.key, getValor(c)])))

  const comparativoData = [
    { label: "Atual", caixa: kpiData.saldoAtual, lucro: kpiData.lucroLiquido, margem: kpiData.lucroMargin },
    { label: "Simulado", caixa: kpiData.saldoAtual + impacto.impactoCaixa, lucro: kpiData.lucroLiquido + impacto.impactoLucro, margem: parseFloat((kpiData.lucroMargin + impacto.impactoMargem).toFixed(1)) },
  ]

  const riscoCor = impacto.risco === "critico" || impacto.risco === "alto" ? "var(--danger)" : impacto.risco === "medio" ? "var(--warning)" : impacto.risco === "positivo" ? "var(--success)" : "var(--success)"

  return (
    <div style={{ padding: "20px", maxWidth: "1400px" }}>

      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.5px" }}>Simulador de Decisão</h1>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "3px 0 0" }}>Simule o impacto financeiro de qualquer decisão antes de tomar</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "14px" }}>

        {/* Seletor de simulação */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "2px" }}>Tipo de decisão</div>
          {simulacoes.map(sim => (
            <button key={sim.tipo} onClick={() => { setSimAtiva(sim); setValores({}) }}
              style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "12px 14px", textAlign: "left", cursor: "pointer",
                background: simAtiva.tipo === sim.tipo ? sim.color + "15" : "var(--bg-secondary)",
                border: `1px solid ${simAtiva.tipo === sim.tipo ? sim.color + "50" : "var(--border)"}`,
                borderRadius: "var(--radius)", transition: "all 0.15s",
              }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: sim.color + "20", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <sim.icon size={15} style={{ color: sim.color }} />
              </div>
              <div>
                <div style={{ fontSize: "12.5px", fontWeight: 700, color: simAtiva.tipo === sim.tipo ? sim.color : "var(--text-primary)" }}>{sim.label}</div>
                <div style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "1px" }}>{sim.descricao}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Painel de simulação */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

          {/* Entradas */}
          <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: simAtiva.color + "20", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <simAtiva.icon size={15} style={{ color: simAtiva.color }} />
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{simAtiva.label}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{simAtiva.descricao}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {simAtiva.campos.map(campo => (
                <div key={campo.key}>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>{campo.label}</label>
                  <input
                    type="number"
                    value={getValor(campo)}
                    onChange={e => setValores(v => ({ ...v, [campo.key]: parseFloat(e.target.value) || 0 }))}
                    style={{
                      width: "100%", padding: "9px 12px", borderRadius: "8px",
                      background: "var(--bg-tertiary)", border: "1px solid var(--border)",
                      color: "var(--text-primary)", fontSize: "14px", fontWeight: 600,
                      outline: "none", boxSizing: "border-box",
                    }}
                    onFocus={e => (e.target as HTMLElement).style.borderColor = "var(--accent)"}
                    onBlur={e => (e.target as HTMLElement).style.borderColor = "var(--border)"}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Resultado */}
          <div style={{ background: "var(--bg-secondary)", border: `1px solid ${riscoCor}28`, borderRadius: "var(--radius-lg)", padding: "20px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "14px" }}>Impacto simulado</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "14px" }}>
              {[
                { label: "Impacto no caixa", value: impacto.impactoCaixa, format: (v: number) => (v >= 0 ? "+" : "") + R(Math.abs(v)), color: impacto.impactoCaixa >= 0 ? "var(--success)" : "var(--danger)" },
                { label: "Impacto no lucro", value: impacto.impactoLucro, format: (v: number) => (v >= 0 ? "+" : "-") + R(Math.abs(v)), color: impacto.impactoLucro >= 0 ? "var(--success)" : "var(--danger)" },
                { label: "Impacto na margem", value: impacto.impactoMargem, format: (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}pp`, color: impacto.impactoMargem >= 0 ? "var(--success)" : "var(--danger)" },
              ].map(item => (
                <div key={item.label} style={{ padding: "12px 14px", background: "var(--bg-tertiary)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "6px" }}>{item.label}</div>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: item.color }}>{item.format(item.value)}</div>
                </div>
              ))}
            </div>

            <div style={{ padding: "12px 14px", borderRadius: "8px", background: riscoCor + "12", border: `1px solid ${riscoCor}30`, marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "4px" }}>
                {impacto.sustentavel ? <CheckCircle size={13} style={{ color: "var(--success)" }} /> : <AlertTriangle size={13} style={{ color: "var(--danger)" }} />}
                <span style={{ fontSize: "11px", fontWeight: 700, color: riscoCor, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  Risco: {impacto.risco === "positivo" ? "Positivo" : impacto.risco === "critico" ? "Crítico" : impacto.risco === "alto" ? "Alto" : impacto.risco === "medio" ? "Médio" : "Baixo"}
                </span>
              </div>
              <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>{impacto.descricao}</p>
            </div>

            {/* Comparativo */}
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={comparativoData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }} barCategoryGap="40%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", borderRadius: "8px", fontSize: "11px" }} formatter={(v: any) => [R(v), ""]} />
                <Bar dataKey="caixa" name="Caixa" fill="var(--accent)" radius={[3, 3, 0, 0]} opacity={0.8} />
                <Bar dataKey="lucro" name="Lucro" fill="var(--success)" radius={[3, 3, 0, 0]} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
