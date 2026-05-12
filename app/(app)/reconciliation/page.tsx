"use client"

import { useState, useRef } from "react"
import { Upload, CheckCircle2, AlertTriangle, HelpCircle, FileText, X } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"

const R = formatCurrency

const matches = [
  { confianca: 98, extrato: { data: "2026-05-08", descricao: "TED RECEBIDA J SILVA EMP", valor: 32000 }, sistema: { descricao: "J. Silva — parcela contrato", categoria: "Contratos" }, nivel: "forte" },
  { confianca: 84, extrato: { data: "2026-05-07", descricao: "PGTO FORNEC AÇO NORDESTE", valor: -12400 }, sistema: { descricao: "Materiais — Aço Nordeste", categoria: "Materiais" }, nivel: "provavel" },
  { confianca: 71, extrato: { data: "2026-05-07", descricao: "DEB DIVERSO 0047", valor: -8400 }, sistema: { descricao: "Aluguel escritório SP", categoria: "Aluguel" }, nivel: "fraco" },
  { confianca: 0, extrato: { data: "2026-05-06", descricao: "TED ENV PESSOA FÍSICA CPF", valor: -3200 }, sistema: null, nivel: "nenhum" },
]

const nivelConfig = {
  forte: { label: "Correspondência forte", color: "var(--success)", bg: "var(--success-soft)", icon: CheckCircle2 },
  provavel: { label: "Provável — revisar", color: "var(--warning)", bg: "var(--warning-soft)", icon: AlertTriangle },
  fraco: { label: "Fraca — verificar", color: "#F97316", bg: "rgba(249,115,22,0.12)", icon: AlertTriangle },
  nenhum: { label: "Não encontrado — criar", color: "var(--danger)", bg: "var(--danger-soft)", icon: HelpCircle },
}

export default function ReconciliationPage() {
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string } | null>(null)
  const [imported, setImported] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleOFX(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const sizeKb = (file.size / 1024).toFixed(1)
    setUploadedFile({ name: file.name, size: `${sizeKb} KB` })
    setTimeout(() => setImported(true), 800)
  }

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.3px" }}>Conciliação Bancária</h1>
        <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>Correspondências encontradas entre extrato e lançamentos</p>
      </div>

      {/* Upload */}
      <input ref={fileRef} type="file" accept=".ofx,.OFX" style={{ display:"none" }} onChange={handleOFX}/>

      {uploadedFile ? (
        <div style={{ background:"var(--bg-secondary)", border:"1px solid var(--success)40", borderRadius:"10px", padding:"16px 20px", marginBottom:"16px", display:"flex", alignItems:"center", gap:"14px" }}>
          <FileText size={22} style={{ color:"var(--success)", flexShrink:0 }}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:"13px", fontWeight:700, color:"var(--text-primary)" }}>{uploadedFile.name}</div>
            <div style={{ fontSize:"11px", color:"var(--text-muted)", marginTop:"2px" }}>{uploadedFile.size} · {imported ? "12 transações importadas · 8 conciliadas automaticamente" : "Processando..."}</div>
          </div>
          {imported && <span style={{ fontSize:"11px", fontWeight:700, color:"var(--success)", background:"var(--success-soft)", padding:"3px 10px", borderRadius:"20px" }}>Importado</span>}
          <button onClick={()=>{setUploadedFile(null);setImported(false);if(fileRef.current)fileRef.current.value=""}} style={{ border:"none",background:"none",cursor:"pointer",color:"var(--text-muted)" }}>
            <X size={16}/>
          </button>
        </div>
      ) : (
      <div style={{ background:"var(--bg-secondary)", border:"2px dashed var(--border)", borderRadius:"10px", padding:"24px", marginBottom:"20px", textAlign:"center" }}
        onDragOver={e=>{ e.preventDefault(); (e.currentTarget as any).style.borderColor="var(--accent)" }}
        onDragLeave={e=>{ (e.currentTarget as any).style.borderColor="var(--border)" }}
        onDrop={e=>{ e.preventDefault(); (e.currentTarget as any).style.borderColor="var(--border)"; const file=e.dataTransfer.files[0]; if(file){const ev={target:{files:e.dataTransfer.files}} as any;handleOFX(ev)} }}>
        <Upload size={24} style={{ color:"var(--text-muted)", marginBottom:"8px" }}/>
        <div style={{ fontSize:"13px", fontWeight:600, color:"var(--text-primary)", marginBottom:"4px" }}>
          Importar extrato OFX
        </div>
        <div style={{ fontSize:"12px", color:"var(--text-secondary)", marginBottom:"12px" }}>
          Arraste o arquivo aqui ou exporte o extrato do seu banco em formato OFX
        </div>
        <button onClick={()=>fileRef.current?.click()} style={{ padding:"8px 20px", background:"var(--accent)", border:"none", borderRadius:"8px", fontSize:"12px", color:"#fff", fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
          Selecionar arquivo OFX
        </button>
      </div>
      )}

      {/* Legend */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
        {Object.entries(nivelConfig).map(([k, v]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: v.color }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: v.color, display: "inline-block" }} />
            {v.label} {k !== "nenhum" && `(${k === "forte" ? "95-100%" : k === "provavel" ? "70-94%" : "<70%"})`}
          </div>
        ))}
      </div>

      {/* Matches */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {matches.map((m, i) => {
          const conf = nivelConfig[m.nivel as keyof typeof nivelConfig]
          const Icon = conf.icon
          return (
            <div key={i} style={{ background: "var(--bg-secondary)", border: `1px solid ${conf.color}30`, borderRadius: "10px", padding: "16px", display: "grid", gridTemplateColumns: "80px 1fr auto 1fr 120px", gap: "16px", alignItems: "center" }}>
              {/* Confiança */}
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "18px", fontWeight: 800, color: conf.color }}>{m.confianca > 0 ? `${m.confianca}%` : "—"}</div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>confiança</div>
              </div>

              {/* Extrato */}
              <div style={{ background: "var(--bg-tertiary)", borderRadius: "8px", padding: "10px 12px" }}>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase" }}>Extrato bancário</div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "3px" }}>{m.extrato.descricao}</div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{formatDate(m.extrato.data)}</span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: m.extrato.valor > 0 ? "var(--success)" : "var(--danger)" }}>
                    {m.extrato.valor > 0 ? "+" : ""}{R(Math.abs(m.extrato.valor))}
                  </span>
                </div>
              </div>

              {/* Arrow */}
              <Icon size={18} style={{ color: conf.color }} />

              {/* Sistema */}
              <div style={{ background: "var(--bg-tertiary)", borderRadius: "8px", padding: "10px 12px" }}>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase" }}>Lançamento no sistema</div>
                {m.sistema ? (
                  <>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "3px" }}>{m.sistema.descricao}</div>
                    <span style={{ fontSize: "11px", background: "var(--bg-elevated)", color: "var(--text-muted)", padding: "1px 7px", borderRadius: "4px", border: "1px solid var(--border)" }}>{m.sistema.categoria}</span>
                  </>
                ) : (
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>Nenhum lançamento encontrado</div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {m.sistema ? (
                  <button style={{ padding: "6px 12px", background: "var(--success-soft)", border: "1px solid var(--success)40", borderRadius: "6px", fontSize: "11px", color: "var(--success)", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    Confirmar
                  </button>
                ) : (
                  <button style={{ padding: "6px 12px", background: "var(--accent-soft)", border: "1px solid var(--accent)40", borderRadius: "6px", fontSize: "11px", color: "var(--accent)", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    Criar lançamento
                  </button>
                )}
                <button style={{ padding: "6px 12px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "11px", color: "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>
                  Ignorar
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
