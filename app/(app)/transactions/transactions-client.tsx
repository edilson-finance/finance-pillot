"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useDialogA11y } from "@/lib/use-dialog-a11y"
import { ChevronLeft, Upload, Plus, Trash2, X, Check as CheckIcon, Info } from "lucide-react"
import Link from "next/link"
import { createReceita, createDespesa, createTransferencia } from "./actions"
import type { RecentEntry } from "@/lib/db/lancamentos"

type Opt = { id: string; name: string }
type Cat = Opt & { kind: string }
type Acc = Opt & { balance: number }
type Prod = Opt & {
  price: number; unit: string | null
  /* Locação: presentes quando o item é um imóvel administrado (ver 0037). */
  partner_id?: string | null
  tenant_id?: string | null
  commission_percent?: number
  rent_amount?: number
}

const today = () => new Date().toISOString().slice(0, 10)
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const round2 = (n: number) => Math.round(n * 100) / 100

// ── estilos base ─────────────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: "100%", padding: "9px 11px", background: "var(--bg-tertiary)",
  border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px",
  color: "var(--text-primary)", outline: "none", fontFamily: "inherit",
}
const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }

function Label({ children, req }: { children: React.ReactNode; req?: boolean }) {
  return (
    <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.4px" }}>
      {children} {req && <span style={{ color: "var(--danger)" }}>*</span>}
    </label>
  )
}
function Section({ children }: { children: string }) {
  return (
    <div style={{ fontSize: "10.5px", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.7px", margin: "22px 0 12px", paddingTop: "18px", borderTop: "1px solid var(--border)" }}>
      {children}
    </div>
  )
}
function Field({ label, req, span, children }: { label: React.ReactNode; req?: boolean; span?: boolean; children: React.ReactNode }) {
  return <div style={span ? { gridColumn: "1 / -1" } : undefined}><Label req={req}>{label}</Label>{children}</div>
}

/* Legenda de campo: ícone ⓘ com tooltip no hover (desktop) e no toque (mobile). */
export function InfoTip({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  return (
    <span style={{ position: "relative", display: "inline-flex", verticalAlign: "middle", marginLeft: "5px" }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <button type="button" aria-label="O que é este campo?"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShow(s => !s) }}
        style={{ border: "none", background: "none", padding: 0, cursor: "help", color: "var(--text-muted)", display: "inline-flex", alignItems: "center" }}>
        <Info size={12} />
      </button>
      {show && (
        <span style={{
          position: "absolute", bottom: "calc(100% + 7px)", left: "-8px",
          width: "min(240px, 72vw)", background: "var(--bg-elevated)", border: "1px solid var(--border-strong)",
          borderRadius: "8px", padding: "9px 11px", fontSize: "11px", fontWeight: 400, lineHeight: 1.55,
          color: "var(--text-secondary)", textTransform: "none", letterSpacing: "normal",
          boxShadow: "var(--shadow-lg)", zIndex: 300, whiteSpace: "normal",
        }}>{text}</span>
      )}
    </span>
  )
}

// ── chips de forma de pagamento ──────────────────────────────────────────────
function Chips({ name, options, color, value, onChange }: {
  name: string; options: string[]; color: string; value: string; onChange: (v: string) => void
}) {
  return (
    <>
      <input type="hidden" name={name} value={value} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {options.map((o) => {
          const on = value === o
          return (
            <button type="button" key={o} onClick={() => onChange(o)} style={{
              padding: "7px 15px", borderRadius: "20px", cursor: "pointer", fontFamily: "inherit",
              fontSize: "12.5px", fontWeight: on ? 700 : 500,
              border: `1px solid ${on ? color : "var(--border)"}`,
              background: on ? `${color}1e` : "var(--bg-secondary)",
              color: on ? color : "var(--text-secondary)",
            }}>{o}</button>
          )
        })}
      </div>
    </>
  )
}

// ── status segmentado (3 botões grandes) ─────────────────────────────────────
function Status({ name, options, color, value, onChange }: {
  name: string; options: { v: string; l: string }[]; color: string; value: string; onChange: (v: string) => void
}) {
  return (
    <>
      <input type="hidden" name={name} value={value} />
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${options.length},1fr)`, gap: "10px" }}>
        {options.map((o) => {
          const on = value === o.v
          return (
            <button type="button" key={o.v} onClick={() => onChange(o.v)} style={{
              padding: "13px", borderRadius: "10px", cursor: "pointer", fontFamily: "inherit",
              fontSize: "13px", fontWeight: on ? 700 : 600,
              border: `1.5px solid ${on ? color : "var(--border)"}`,
              background: on ? `${color}14` : "var(--bg-secondary)",
              color: on ? color : "var(--text-secondary)",
            }}>{o.l}</button>
          )
        })}
      </div>
    </>
  )
}

function Check({ checked, onChange, label }: { checked: boolean; onChange: (b: boolean) => void; label: string }) {
  // Input real (acessível por teclado + leitor de tela) visualmente escondido e
  // sobreposto ao indicador visual. O <label> envolve tudo, então clicar e o
  // Espaço alternam o estado, e o rótulo é o nome acessível. O foco por teclado
  // aparece pelo :focus-visible global.
  return (
    <label style={{ position: "relative", display: "flex", alignItems: "center", gap: "9px", cursor: "pointer", fontSize: "13px", color: "var(--text-secondary)" }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: "18px", height: "18px", margin: 0, opacity: 0, cursor: "pointer" }}
      />
      <span aria-hidden="true" style={{
        width: "18px", height: "18px", borderRadius: "5px", display: "flex", alignItems: "center", justifyContent: "center", flex: "none",
        border: `1.5px solid ${checked ? "var(--accent)" : "var(--border)"}`, background: checked ? "var(--accent)" : "transparent",
      }}>{checked && <CheckIcon size={12} color="#fff" />}</span>
      {label}
    </label>
  )
}

// ── combobox com busca inteligente (cliente/fornecedor) ──────────────────────
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()

function Combo({ idName, nameName, options, color, placeholder, required }: {
  idName: string; nameName: string; options: Opt[]; color: string; placeholder: string; required?: boolean
}) {
  const [query, setQuery] = useState("")
  const [id, setId] = useState("")
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const box = useRef<HTMLDivElement>(null)

  const tokens = norm(query).split(/\s+/).filter(Boolean)
  const filtered = options
    .filter((o) => { const n = norm(o.name); return tokens.every((t) => n.includes(t)) })
    .slice(0, 50)
  const exact = options.some((o) => norm(o.name) === norm(query))
  const showCreate = query.trim() !== "" && !exact

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])

  const pick = (o: Opt) => { setQuery(o.name); setId(o.id); setOpen(false) }

  return (
    <div ref={box} style={{ position: "relative" }}>
      <input type="hidden" name={idName} value={id} />
      <input
        name={nameName} required={required} autoComplete="off" value={query} placeholder={placeholder}
        onChange={(e) => { setQuery(e.target.value); setId(""); setOpen(true); setHi(0) }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) { setOpen(true); return }
          const max = filtered.length - 1
          if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(max, h + 1)) }
          else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(0, h - 1)) }
          else if (e.key === "Enter") { if (open && filtered[hi]) { e.preventDefault(); pick(filtered[hi]) } }
          else if (e.key === "Escape") setOpen(false)
        }}
        style={{ ...inp, paddingRight: "32px" }}
      />
      <span style={{ position: "absolute", right: "12px", top: "10px", color: "var(--text-muted)", pointerEvents: "none", fontSize: "11px" }}>▾</span>
      {open && (filtered.length > 0 || showCreate) && (
        <div style={{
          position: "absolute", zIndex: 30, top: "calc(100% + 4px)", left: 0, right: 0, maxHeight: "240px",
          overflowY: "auto", background: "var(--bg-secondary)", border: "1px solid var(--border)",
          borderRadius: "10px", boxShadow: "0 12px 28px rgba(0,0,0,0.35)", padding: "5px",
        }}>
          {filtered.map((o, i) => (
            <button type="button" key={o.id} onMouseDown={(e) => { e.preventDefault(); pick(o) }} onMouseEnter={() => setHi(i)}
              style={{
                display: "block", width: "100%", textAlign: "left", padding: "9px 11px", borderRadius: "7px",
                border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "13px",
                background: i === hi ? `${color}1e` : "transparent", color: i === hi ? color : "var(--text-primary)",
              }}>{o.name}</button>
          ))}
          {showCreate && (
            <button type="button" onMouseDown={(e) => { e.preventDefault(); setId(""); setOpen(false) }}
              style={{
                display: "flex", alignItems: "center", gap: "7px", width: "100%", textAlign: "left",
                padding: "9px 11px", borderRadius: "7px", border: "none", cursor: "pointer", fontFamily: "inherit",
                fontSize: "13px", background: "transparent", color: "var(--text-secondary)",
                borderTop: filtered.length ? "1px solid var(--border)" : "none", marginTop: filtered.length ? "4px" : 0,
              }}>
              <Plus size={13} /> Criar novo:&nbsp;<strong style={{ color: "var(--text-primary)" }}>{query}</strong>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── combobox de seleção com busca (conjunto fechado: categoria, conta, etc.) ──
// Diferente do Combo: NÃO permite criar item novo (a lista é fixa) e a validação
// "obrigatório" recai sobre o id realmente escolhido — digitar texto que não casa
// com nenhuma opção mantém o campo inválido até selecionar um item da lista.
function ComboSelect({ idName, options, color, placeholder, required, defaultId }: {
  idName: string; options: Opt[]; color: string; placeholder: string; required?: boolean; defaultId?: string
}) {
  const initial = defaultId ? options.find((o) => o.id === defaultId) : undefined
  const [query, setQuery] = useState(initial?.name ?? "")
  const [id, setId] = useState(initial?.id ?? "")
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const box = useRef<HTMLDivElement>(null)
  const field = useRef<HTMLInputElement>(null)

  const tokens = norm(query).split(/\s+/).filter(Boolean)
  const filtered = options
    .filter((o) => { const n = norm(o.name); return tokens.every((t) => n.includes(t)) })
    .slice(0, 50)

  // "obrigatório" baseado no id selecionado (não no texto digitado)
  useEffect(() => {
    field.current?.setCustomValidity(required && !id ? "Selecione uma opção da lista." : "")
  }, [id, required])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])

  const pick = (o: Opt) => { setQuery(o.name); setId(o.id); setOpen(false) }

  // ao sair do campo, se o texto bate exatamente com uma opção (ex.: digitou tudo
  // e não clicou), resolve o id automaticamente; caso contrário deixa como está e a
  // validação de "obrigatório" cobra a seleção de um item válido da lista.
  const onBlur = () => {
    if (!query.trim()) { setId(""); return }
    const hit = options.find((o) => norm(o.name) === norm(query))
    if (hit) { setQuery(hit.name); setId(hit.id) }
  }

  return (
    <div ref={box} style={{ position: "relative" }}>
      <input type="hidden" name={idName} value={id} />
      <input
        ref={field} autoComplete="off" value={query} placeholder={placeholder}
        onChange={(e) => { setQuery(e.target.value); setId(""); setOpen(true); setHi(0) }}
        onFocus={() => setOpen(true)}
        onBlur={onBlur}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) { setOpen(true); return }
          const max = filtered.length - 1
          if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(max, h + 1)) }
          else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(0, h - 1)) }
          else if (e.key === "Enter") { if (open && filtered[hi]) { e.preventDefault(); pick(filtered[hi]) } }
          else if (e.key === "Escape") setOpen(false)
        }}
        style={{ ...inp, paddingRight: "32px" }}
      />
      <span style={{ position: "absolute", right: "12px", top: "10px", color: "var(--text-muted)", pointerEvents: "none", fontSize: "11px" }}>▾</span>
      {open && (
        <div style={{
          position: "absolute", zIndex: 30, top: "calc(100% + 4px)", left: 0, right: 0, maxHeight: "240px",
          overflowY: "auto", background: "var(--bg-secondary)", border: "1px solid var(--border)",
          borderRadius: "10px", boxShadow: "0 12px 28px rgba(0,0,0,0.35)", padding: "5px",
        }}>
          {filtered.map((o, i) => (
            <button type="button" key={o.id} onMouseDown={(e) => { e.preventDefault(); pick(o) }} onMouseEnter={() => setHi(i)}
              style={{
                display: "block", width: "100%", textAlign: "left", padding: "9px 11px", borderRadius: "7px",
                border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "13px",
                background: i === hi ? `${color}1e` : "transparent", color: i === hi ? color : "var(--text-primary)",
              }}>{o.name}</button>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: "9px 11px", fontSize: "12.5px", color: "var(--text-muted)" }}>
              {options.length === 0 ? "Nenhuma opção cadastrada." : "Nenhum resultado para sua busca."}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── máscaras e validações ────────────────────────────────────────────────────
const onlyDigits = (s: string) => s.replace(/\D/g, "")

function maskPhone(v: string): string {
  const d = onlyDigits(v).slice(0, 11)
  if (!d) return ""
  let o = "(" + d.slice(0, 2)
  if (d.length >= 2) o += ") "
  if (d.length <= 10) {
    o += d.slice(2, 6)
    if (d.length > 6) o += "-" + d.slice(6, 10)
  } else {
    o += d.slice(2, 7)
    if (d.length > 7) o += "-" + d.slice(7, 11)
  }
  return o
}
function maskDoc(v: string): string {
  const d = onlyDigits(v).slice(0, 14)
  if (d.length <= 11) {
    let o = d.slice(0, 3)
    if (d.length > 3) o += "." + d.slice(3, 6)
    if (d.length > 6) o += "." + d.slice(6, 9)
    if (d.length > 9) o += "-" + d.slice(9, 11)
    return o
  }
  let o = d.slice(0, 2) + "." + d.slice(2, 5) + "." + d.slice(5, 8) + "/" + d.slice(8, 12)
  if (d.length > 12) o += "-" + d.slice(12, 14)
  return o
}
function isValidCPF(d: string): boolean {
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false
  let s = 0
  for (let i = 0; i < 9; i++) s += parseInt(d[i]) * (10 - i)
  let r = (s * 10) % 11; if (r === 10) r = 0
  if (r !== parseInt(d[9])) return false
  s = 0
  for (let i = 0; i < 10; i++) s += parseInt(d[i]) * (11 - i)
  r = (s * 10) % 11; if (r === 10) r = 0
  return r === parseInt(d[10])
}
function isValidCNPJ(d: string): boolean {
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false
  const calc = (len: number) => {
    const w = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    let s = 0
    for (let i = 0; i < len; i++) s += parseInt(d[i]) * w[i]
    const r = s % 11
    return r < 2 ? 0 : 11 - r
  }
  return calc(12) === parseInt(d[12]) && calc(13) === parseInt(d[13])
}
const vEmail = (v: string) => (!v ? "" : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "" : "E-mail inválido")
const vPhone = (v: string) => {
  const d = onlyDigits(v)
  if (!d) return ""
  return d.length === 10 || d.length === 11 ? "" : "Telefone incompleto"
}
const vDoc = (v: string) => {
  const d = onlyDigits(v)
  if (!d) return ""
  if (d.length === 11) return isValidCPF(d) ? "" : "CPF inválido"
  if (d.length === 14) return isValidCNPJ(d) ? "" : "CNPJ inválido"
  return "CPF/CNPJ incompleto"
}

// input com máscara + validação inline (bloqueia o submit via setCustomValidity)
function FieldInput({ name, type = "text", placeholder, required, mask, validate }: {
  name: string; type?: string; placeholder?: string; required?: boolean
  mask?: (v: string) => string; validate?: (v: string) => string
}) {
  const [v, setV] = useState("")
  const [touched, setTouched] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  const err = validate ? validate(v) : ""
  useEffect(() => { ref.current?.setCustomValidity(err) }, [err])
  return (
    <>
      <input ref={ref} name={name} type={type} required={required} value={v} placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => setV(mask ? mask(e.target.value) : e.target.value)}
        onBlur={() => setTouched(true)}
        style={{ ...inp, borderColor: touched && err ? "var(--danger)" : "var(--border)" }} />
      {touched && err && <div style={{ fontSize: "11px", color: "var(--danger)", marginTop: "5px", fontWeight: 600 }}>{err}</div>}
    </>
  )
}

// campo monetário estilo caixa (R$ ao vivo); submete no formato pt-BR que o action espera
function Money({ name, color, required }: { name: string; color: string; required?: boolean }) {
  const [cents, setCents] = useState(0)
  const ref = useRef<HTMLInputElement>(null)
  const display = (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  useEffect(() => {
    ref.current?.setCustomValidity(required && cents <= 0 ? "Informe um valor maior que zero" : "")
  }, [cents, required])
  const zero = cents === 0
  return (
    <div style={{ position: "relative" }}>
      <span style={{ position: "absolute", left: "11px", top: "9px", fontSize: "13px", fontWeight: 600, color: zero ? "var(--text-muted)" : color, pointerEvents: "none" }}>R$</span>
      <input ref={ref} name={name} required={required} inputMode="numeric" value={display}
        onChange={(e) => { const d = onlyDigits(e.target.value); setCents(d ? parseInt(d.slice(0, 13)) : 0) }}
        style={{ ...inp, paddingLeft: "36px", color: zero ? "var(--text-muted)" : "var(--text-primary)" }} />
    </div>
  )
}

/* Juros/Multa em R$ OU em % do Valor Total. Envia `interest` + `interest_mode`;
   no modo %, o servidor converte para R$ sobre o amount ao salvar. Só um input
   `interest` fica montado por vez (trocar de modo zera o outro). */
function InterestField({ color }: { color: string }) {
  const [mode, setMode] = useState<"valor" | "percent">("valor")
  const [pct, setPct] = useState("")
  const modeBtn = (m: "valor" | "percent", l: string) => (
    <button type="button" onClick={() => setMode(m)} style={{
      padding: "0 13px", border: "none", cursor: "pointer", fontFamily: "inherit",
      fontSize: "12px", fontWeight: mode === m ? 800 : 500,
      background: mode === m ? color : "transparent",
      color: mode === m ? "#fff" : "var(--text-secondary)",
      transition: "background 0.15s",
    }}>{l}</button>
  )
  return (
    <div>
      <input type="hidden" name="interest_mode" value={mode} />
      <div style={{ display: "flex", gap: "8px", alignItems: "stretch" }}>
        <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: "6px", overflow: "hidden", flexShrink: 0 }}>
          {modeBtn("valor", "R$")}
          {modeBtn("percent", "%")}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {mode === "valor" ? (
            <Money name="interest" color={color} />
          ) : (
            <div style={{ position: "relative" }}>
              <input name="interest" inputMode="decimal" value={pct} placeholder="0,00"
                onChange={(e) => {
                  // normaliza ponto→vírgula (teclado numérico mobile) e permite só uma vírgula
                  let v = e.target.value.replace(/\./g, ",").replace(/[^\d,]/g, "")
                  const i = v.indexOf(",")
                  if (i !== -1) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/,/g, "")
                  setPct(v.slice(0, 7))
                }}
                style={{ ...inp, paddingRight: "32px", color: pct ? "var(--text-primary)" : "var(--text-muted)" }} />
              <span style={{ position: "absolute", right: "11px", top: "9px", fontSize: "13px", fontWeight: 600, color: pct ? color : "var(--text-muted)", pointerEvents: "none" }}>%</span>
            </div>
          )}
        </div>
      </div>
      {mode === "percent" && (
        <div style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "5px", lineHeight: 1.5 }}>
          Percentual sobre o Valor Total — o valor em R$ é calculado automaticamente ao salvar.
        </div>
      )}
    </div>
  )
}

// modal de sucesso — gate separado do corpo para o hook de a11y (useEffect) rodar
// só quando o modal abre (foco no diálogo + Esc para fechar).
function SuccessModal(props: {
  open: boolean; title: string; subtitle: string; color: string; onNew: () => void; onClose: () => void
}) {
  if (!props.open) return null
  return <SuccessModalBody {...props} />
}
function SuccessModalBody({ title, subtitle, color, onNew, onClose }: {
  title: string; subtitle: string; color: string; onNew: () => void; onClose: () => void
}) {
  const dialogRef = useDialogA11y<HTMLDivElement>(onClose)
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
    }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: "400px", background: "var(--bg-secondary)", border: "1px solid var(--border)",
        borderRadius: "16px", padding: "30px", textAlign: "center", boxShadow: "0 24px 60px rgba(0,0,0,0.5)", outline: "none",
      }}>
        <div style={{ width: "62px", height: "62px", borderRadius: "50%", background: `${color}22`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
          <CheckIcon size={30} color={color} />
        </div>
        <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "7px" }}>{title}</div>
        <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "22px" }}>{subtitle}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <button type="button" onClick={onNew} style={{ padding: "12px", background: color, border: "none", borderRadius: "10px", color: "#fff", fontWeight: 700, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>Lançar outro</button>
          <button type="button" onClick={onClose} style={{ padding: "12px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "10px", color: "var(--text-secondary)", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>Fechar</button>
        </div>
      </div>
    </div>
  )
}

// ── upload de anexos ─────────────────────────────────────────────────────────
const MAX_FILE_MB = 4
function Dropzone({ files, setFiles, accept }: { files: File[]; setFiles: (f: File[]) => void; accept: string }) {
  const ref = useRef<HTMLInputElement>(null)
  const [warn, setWarn] = useState("")
  const onPick = (picked: File[]) => {
    const ok = picked.filter((f) => f.size <= MAX_FILE_MB * 1024 * 1024)
    const big = picked.filter((f) => f.size > MAX_FILE_MB * 1024 * 1024)
    setFiles(ok)
    if (ref.current) ref.current.value = ""
    setWarn(big.length ? `${big.map((f) => f.name).join(", ")} — acima de ${MAX_FILE_MB}MB e ${big.length > 1 ? "foram ignorados" : "foi ignorado"}.` : "")
  }
  return (
    <div>
      <div onClick={() => ref.current?.click()} style={{
        border: "1.5px dashed var(--border)", borderRadius: "10px", padding: "22px", textAlign: "center", cursor: "pointer",
      }}>
        <Upload size={20} style={{ color: "var(--text-muted)", marginBottom: "6px" }} />
        <div style={{ fontSize: "12.5px", color: "var(--text-secondary)" }}>
          Arraste ou <span style={{ color: "var(--accent)", fontWeight: 600 }}>clique para selecionar</span>
        </div>
        <div style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "3px" }}>{accept} · Máx {MAX_FILE_MB}MB por arquivo</div>
      </div>
      <input ref={ref} type="file" name="attachments" multiple hidden
        onChange={(e) => onPick(e.target.files ? Array.from(e.target.files) : [])} />
      {warn && <div style={{ marginTop: "8px", fontSize: "11.5px", color: "var(--danger)", fontWeight: 600 }}>{warn}</div>}
      {files.length > 0 && (
        <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {files.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", color: "var(--text-secondary)", background: "var(--bg-tertiary)", padding: "7px 11px", borderRadius: "7px" }}>
              <span>{f.name} · {(f.size / 1024).toFixed(0)} KB</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── editor de itens ──────────────────────────────────────────────────────────
type Item = { description: string; quantity: number; unit_price: number }
function ItemsEditor({ items, setItems, products }: { items: Item[]; setItems: (i: Item[]) => void; products: Prod[] }) {
  const upd = (i: number, patch: Partial<Item>) => setItems(items.map((it, idx) => idx === i ? { ...it, ...patch } : it))
  return (
    <div style={{ marginTop: "12px" }}>
      <input type="hidden" name="has_items" value="true" />
      <input type="hidden" name="items_json" value={JSON.stringify(items)} />
      {items.map((it, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 0.7fr 1fr auto", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
          <input list="prod-list" placeholder="Descrição do item" value={it.description}
            onChange={(e) => {
              const p = products.find((p) => p.name === e.target.value)
              upd(i, p ? { description: p.name, unit_price: p.price } : { description: e.target.value })
            }} style={inp} />
          <input type="number" step="0.001" min="0" placeholder="Qtd" value={it.quantity || ""}
            onChange={(e) => upd(i, { quantity: Number(e.target.value) })} style={inp} />
          <input type="number" step="0.01" min="0" placeholder="Valor unit." value={it.unit_price || ""}
            onChange={(e) => upd(i, { unit_price: Number(e.target.value) })} style={inp} />
          <button type="button" onClick={() => setItems(items.filter((_, idx) => idx !== i))}
            style={{ width: "34px", height: "34px", borderRadius: "7px", border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--danger)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <datalist id="prod-list">{products.map((p) => <option key={p.id} value={p.name} />)}</datalist>
      <button type="button" onClick={() => setItems([...items, { description: "", quantity: 1, unit_price: 0 }])}
        style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px", color: "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>
        <Plus size={13} /> Adicionar item
      </button>
      {items.length > 0 && (
        <div style={{ marginTop: "10px", textAlign: "right", fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>
          Total dos itens: {brl(items.reduce((s, it) => s + it.quantity * it.unit_price, 0))}
        </div>
      )}
    </div>
  )
}

// ── botões de ação do rodapé ─────────────────────────────────────────────────
function Actions({ label, color, saving, onKeepNew, onCancel }: { label: string; color: string; saving: boolean; onKeepNew: () => void; onCancel?: () => void }) {
  const router = useRouter()
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "10px", marginTop: "24px" }}>
      <button type="submit" disabled={saving} style={{ padding: "13px", background: color, border: "none", borderRadius: "10px", fontSize: "13.5px", color: "#fff", fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1, fontFamily: "inherit" }}>
        {saving ? "Salvando..." : label}
      </button>
      <button type="submit" disabled={saving} onClick={onKeepNew} style={{ padding: "13px 18px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "10px", fontSize: "13px", color: "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>
        Salvar e novo
      </button>
      <button type="button" onClick={() => (onCancel ? onCancel() : router.push("/"))} style={{ padding: "13px 18px", background: "transparent", border: "1px solid var(--border)", borderRadius: "10px", fontSize: "13px", color: "var(--text-muted)", cursor: "pointer", fontFamily: "inherit" }}>
        Cancelar
      </button>
    </div>
  )
}

function Banner({ error, ok }: { error: string | null; ok: boolean }) {
  if (!error && !ok) return null
  const c = error ? "var(--danger)" : "var(--success)"
  return (
    <div style={{ marginTop: "16px", padding: "11px 14px", borderRadius: "9px", border: `1px solid ${c}55`, background: `${c}14`, color: c, fontSize: "12.5px", fontWeight: 600 }}>
      {error ?? "Lançamento salvo com sucesso."}
    </div>
  )
}

// hook compartilhado de submit
function useSubmit(action: (fd: FormData) => Promise<{ error: string | null }>, onSaved: () => void) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const keepNew = useRef(false)
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    // dispara a validação nativa + mensagens de setCustomValidity (e-mail, telefone, CPF/CNPJ, valor)
    if (!form.reportValidity()) return
    setSaving(true); setError(null); setOk(false)
    try {
      const res = await action(new FormData(form))
      if (res.error) setError(res.error)
      else { setOk(true); onSaved() }
    } catch {
      setError("Não foi possível salvar. Verifique o tamanho dos anexos (máx 4MB cada) e tente novamente.")
    } finally {
      setSaving(false)
    }
  }
  return { saving, error, ok, setOk, keepNew, onSubmit }
}

const card: React.CSSProperties = { background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "14px", padding: "26px" }

// ════════════════════════ RECEITA ════════════════════════
export function FormReceita({ o, onSaved, onNew, onCancel }: { o: Options; onSaved: () => void; onNew: () => void; onCancel?: () => void }) {
  const C = "var(--success)"
  const { saving, error, ok, setOk, keepNew, onSubmit } = useSubmit(createReceita, onSaved)
  const [pm, setPm] = useState("PIX")
  const [status, setStatus] = useState("a_receber")
  const [detail, setDetail] = useState(false)
  const [items, setItems] = useState<Item[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [parc, setParc] = useState(false)
  const [rec, setRec] = useState(false)
  return (
    <form onSubmit={onSubmit} style={card}>
      <Section>Identificação da Receita</Section>
      <div style={grid2}>
        <Field label="Valor Total" req><Money name="amount" color={C} required /></Field>
        <Field label="Data de Vencimento / Entrega" req><input name="due_date" type="date" required defaultValue={today()} style={inp} /></Field>
        <Field label="Descrição da Receita" req span><input name="description" required placeholder="Ex: Medição 12 — Obra 07 / Prestação de serviço" style={inp} /></Field>
        <Field label="Data de Competência"><input name="competence_date" type="date" defaultValue={today()} style={inp} /></Field>
        <Field label="Número NF / Documento"><input name="document_number" placeholder="NF-000123 / Contrato 007" style={inp} /></Field>
        <Field label="Conta de Destino" req>
          <select name="account_id" required style={inp}><option value="">Selecione...</option>{o.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
        </Field>
        <Field label="Categoria da Receita" req>
          <ComboSelect idName="category_id" options={o.categories} color="var(--success)" required placeholder="Buscar categoria..." />
        </Field>
        <Field label="Centro de Custo / Obra" req>
          <select name="cost_center_id" required style={inp}><option value="">Selecione...</option>{o.costCenters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </Field>
      </div>

      <Section>Cliente</Section>
      <div style={grid2}>
        <Field label="Cliente" req span>
          <Combo idName="customer_id" nameName="customer_name" options={o.customers} color="var(--success)" required placeholder="Buscar cliente cadastrado ou digitar nome..." />
        </Field>
        <Field label="CPF / CNPJ"><FieldInput name="counterparty_doc" mask={maskDoc} validate={vDoc} placeholder="00.000.000/0001-00" /></Field>
        <Field label="Contato (telefone / whatsapp)"><FieldInput name="contact" mask={maskPhone} validate={vPhone} placeholder="(11) 99999-9999" /></Field>
        <Field label="E-mail para envio de recibo"><FieldInput name="email" validate={vEmail} placeholder="financeiro@cliente.com.br" /></Field>
        <Field label="Prazo de Pagamento (dias)"><input name="payment_term_days" type="number" min="0" placeholder="30" style={inp} /></Field>
      </div>

      {o.partnerReceiversEnabled && (
        <>
          <Section>Recebedor do Valor (parceiro)</Section>
          <PartnerBlock o={o} color={C} />
        </>
      )}

      <Section>Produto / Serviço</Section>
      <Check checked={detail} onChange={setDetail} label="Detalhar produto ou serviço vendido" />
      {detail && <ItemsEditor items={items} setItems={setItems} products={o.products} />}

      <Section>Recebimento</Section>
      <Label>Forma de Recebimento</Label>
      <Chips name="payment_method" color={C} value={pm} onChange={setPm}
        options={["PIX", "Boleto", "TED/DOC", "Cheque", "Cartão Débito", "Cartão Crédito", "Dinheiro", "Depósito", "Outro"]} />
      <div style={{ height: "16px" }} />
      <Label>Status</Label>
      <Status name="status" color="var(--accent)" value={status} onChange={setStatus}
        options={[{ v: "a_receber", l: "A Receber" }, { v: "recebido", l: "Recebido" }, { v: "recebido_parcial", l: "Parcialmente Recebido" }]} />

      <Section>Parcelamento</Section>
      <div style={{ display: "flex", gap: "28px" }}>
        <Check checked={parc} onChange={(b) => { setParc(b); if (b) setRec(false) }} label="Parcelado (ex: medições mensais)" />
        <Check checked={rec} onChange={(b) => { setRec(b); if (b) setParc(false) }} label="Recorrente (contrato fixo)" />
      </div>
      {parc && <div style={{ marginTop: "12px", maxWidth: "260px" }}><Label>Nº de parcelas</Label><input name="installments_count" type="number" min="2" max="120" defaultValue="2" style={inp} /></div>}
      {rec && <div style={{ marginTop: "12px", maxWidth: "260px" }}><Label>Repetições mensais</Label><input name="recurrence_count" type="number" min="2" max="60" defaultValue="12" style={inp} /></div>}

      <Section>Extras</Section>
      <Label>Observações</Label>
      <textarea name="notes" rows={3} placeholder="Referências do contrato, condições especiais..." style={{ ...inp, resize: "vertical" }} />
      <div style={{ height: "16px" }} />
      <Label>Anexos (NF, boleto, comprovante)</Label>
      <Dropzone files={files} setFiles={setFiles} accept="PDF, JPG, PNG, XML" />

      <Banner error={error} ok={false} />
      <Actions label="Salvar Receita" color={C} saving={saving} onKeepNew={() => (keepNew.current = true)} onCancel={onCancel} />
      <SuccessModal open={ok} color={C} title="Receita salva!"
        subtitle="O lançamento foi registrado em Contas a Receber. A baixa no caixa é criada automaticamente quando o status é Recebido."
        onNew={onNew} onClose={() => { setOk(false); onCancel?.() }} />
    </form>
  )
}

// ════════════════════════ DESPESA ════════════════════════
export function FormDespesa({ o, onSaved, onNew, onCancel }: { o: Options; onSaved: () => void; onNew: () => void; onCancel?: () => void }) {
  const C = "var(--danger)"
  const { saving, error, ok, setOk, keepNew, onSubmit } = useSubmit(createDespesa, onSaved)
  const [pm, setPm] = useState("PIX")
  const [status, setStatus] = useState("a_pagar")
  const [detail, setDetail] = useState(false)
  const [items, setItems] = useState<Item[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [parc, setParc] = useState(false)
  const [rec, setRec] = useState(false)
  return (
    <form onSubmit={onSubmit} style={card}>
      <Section>Identificação da Despesa</Section>
      <div style={grid2}>
        <Field label="Valor Total" req><Money name="amount" color={C} required /></Field>
        <Field label="Data de Vencimento" req><input name="due_date" type="date" required defaultValue={today()} style={inp} /></Field>
        <Field label="Descrição da Despesa" req span><input name="description" required placeholder="Ex: Folha de maio / Aluguel escritório / Material Obra 07" style={inp} /></Field>
        <Field label="Data de Competência"><input name="competence_date" type="date" defaultValue={today()} style={inp} /></Field>
        <Field label="Nº Nota Fiscal / Boleto"><input name="document_number" placeholder="NF 000456 / Código de barras" style={inp} /></Field>
        <Field label="Conta de Pagamento" req>
          <select name="account_id" required style={inp}><option value="">Selecione...</option>{o.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
        </Field>
        <Field label="Categoria da Despesa" req>
          <ComboSelect idName="category_id" options={o.categories} color="var(--danger)" required placeholder="Buscar categoria..." />
        </Field>
        <Field label="Centro de Custo / Departamento" req>
          <select name="cost_center_id" required style={inp}><option value="">Selecione...</option>{o.costCenters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </Field>
      </div>

      <Section>Fornecedor</Section>
      <div style={grid2}>
        <Field label="Fornecedor" req span>
          <Combo idName="supplier_id" nameName="supplier_name" options={o.suppliers} color="var(--danger)" required placeholder="Buscar fornecedor cadastrado ou digitar nome..." />
        </Field>
        <Field label="CPF / CNPJ"><FieldInput name="counterparty_doc" mask={maskDoc} validate={vDoc} placeholder="00.000.000/0001-00" /></Field>
        <Field label="Dados Bancários / PIX"><input name="counterparty_bank" placeholder="Chave PIX, banco, agência, conta" style={inp} /></Field>
      </div>

      <Section>Produto / Serviço</Section>
      <Check checked={detail} onChange={setDetail} label="Detalhar itens comprados" />
      {detail && <ItemsEditor items={items} setItems={setItems} products={o.products} />}

      <Section>Pagamento</Section>
      <Label>Forma de Pagamento</Label>
      <Chips name="payment_method" color={C} value={pm} onChange={setPm}
        options={["PIX", "Boleto", "TED/DOC", "Débito Automático", "Cheque", "Cartão Crédito PJ", "Dinheiro", "Nota Promissória"]} />
      <div style={{ height: "16px" }} />
      <Label>Status</Label>
      <Status name="status" color="var(--accent)" value={status} onChange={setStatus}
        options={[{ v: "a_pagar", l: "A Pagar" }, { v: "pago", l: "Pago" }, { v: "pago_parcial", l: "Pago Parcialmente" }]} />
      <div style={{ height: "16px" }} />
      <div style={grid2}>
        <Field label="Juros / Multa R$"><Money name="interest" color={C} /></Field>
        <Field label="Desconto Obtido R$"><Money name="discount" color={C} /></Field>
      </div>

      <Section>Parcelamento e Recorrência</Section>
      <div style={{ display: "flex", gap: "28px" }}>
        <Check checked={parc} onChange={(b) => { setParc(b); if (b) setRec(false) }} label="Parcelado" />
        <Check checked={rec} onChange={(b) => { setRec(b); if (b) setParc(false) }} label="Recorrente (aluguel, assinatura, etc.)" />
      </div>
      {parc && <div style={{ marginTop: "12px", maxWidth: "260px" }}><Label>Nº de parcelas</Label><input name="installments_count" type="number" min="2" max="120" defaultValue="2" style={inp} /></div>}
      {rec && <div style={{ marginTop: "12px", maxWidth: "260px" }}><Label>Repetições mensais</Label><input name="recurrence_count" type="number" min="2" max="60" defaultValue="12" style={inp} /></div>}

      <Section>Extras</Section>
      <Label>Observações</Label>
      <textarea name="notes" rows={3} placeholder="Condições negociadas, referências do pedido de compra..." style={{ ...inp, resize: "vertical" }} />
      <div style={{ height: "16px" }} />
      <Label>Anexos (NF, boleto, comprovante)</Label>
      <Dropzone files={files} setFiles={setFiles} accept="PDF, JPG, PNG, XML" />

      <Banner error={error} ok={false} />
      <Actions label="Salvar Despesa" color={C} saving={saving} onKeepNew={() => (keepNew.current = true)} onCancel={onCancel} />
      <SuccessModal open={ok} color={C} title="Despesa salva!"
        subtitle="O lançamento foi registrado em Contas a Pagar. A baixa no caixa é criada automaticamente quando o status é Pago."
        onNew={onNew} onClose={() => { setOk(false); onCancel?.() }} />
    </form>
  )
}

// ════════════════════════ TRANSFERÊNCIA ════════════════════════
function FormTransferencia({ o, onSaved, onNew }: { o: Options; onSaved: () => void; onNew: () => void }) {
  const C = "var(--accent)"
  const { saving, error, ok, setOk, keepNew, onSubmit } = useSubmit(createTransferencia, onSaved)
  const [tt, setTt] = useState("PIX")
  const [files, setFiles] = useState<File[]>([])
  return (
    <form onSubmit={onSubmit} style={card}>
      <Section>Dados da Transferência</Section>
      <div style={grid2}>
        <Field label="Valor" req><Money name="amount" color={C} required /></Field>
        <Field label="Data" req><input name="date" type="date" required defaultValue={today()} style={inp} /></Field>
        <Field label="Conta de Origem" req>
          <select name="account_id" required style={inp}><option value="">Selecione...</option>{o.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}{a.balance != null ? ` — ${brl(a.balance)}` : ""}</option>)}</select>
        </Field>
        <Field label="Conta de Destino" req>
          <select name="to_account_id" required style={inp}><option value="">Selecione...</option>{o.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}{a.balance != null ? ` — ${brl(a.balance)}` : ""}</option>)}</select>
        </Field>
      </div>
      <div style={{ height: "16px" }} />
      <Label>Tipo de Transferência</Label>
      <Chips name="transfer_type" color={C} value={tt} onChange={setTt}
        options={["PIX", "TED", "DOC", "Interna", "Outro"]} />
      <div style={{ height: "16px" }} />
      <div style={grid2}>
        <Field label="Nº Comprovante"><input name="document_number" placeholder="Nº TED / PIX / EndToEnd" style={inp} /></Field>
        <Field label="Descrição"><input name="description" placeholder="Ex: Transferência para caixa / Retirada pró-labore" style={inp} /></Field>
      </div>

      <Section>Taxas (se houver)</Section>
      <div style={grid2}>
        <Field label="Tarifa Bancária R$"><Money name="fee" color={C} /></Field>
        <Field label="IOF / Imposto R$"><Money name="tax" color={C} /></Field>
      </div>
      <div style={{ marginTop: "16px", padding: "13px 15px", borderRadius: "9px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
        <strong style={{ color: "var(--text-primary)" }}>Importante</strong><br />
        Transferências entre contas da mesma empresa <strong>não impactam o DRE</strong> nem o fluxo operacional — apenas movimentam o saldo entre contas.
      </div>
      <div style={{ height: "16px" }} />
      <Label>Comprovante</Label>
      <Dropzone files={files} setFiles={setFiles} accept="PDF, JPG, PNG" />

      <Banner error={error} ok={false} />
      <Actions label="Salvar Transferência" color={C} saving={saving} onKeepNew={() => (keepNew.current = true)} />
      <SuccessModal open={ok} color={C} title="Transferência salva!"
        subtitle="A movimentação entre contas foi registrada. Ela não impacta o DRE — apenas remaneja o saldo entre as contas."
        onNew={onNew} onClose={() => setOk(false)} />
    </form>
  )
}

// ── tipos das opções ─────────────────────────────────────────────────────────
/* Recebedor parceiro / locação.
   Escolher um imóvel administrado preenche sozinho o proprietário e a comissão —
   o usuário não precisa lembrar de quem é o imóvel nem qual o percentual. */
function PartnerBlock({ o, color }: { o: Options; color: string }) {
  const imoveis = (o.products ?? []).filter((p) => p.partner_id)
  const [imovelId, setImovelId] = useState("")
  const [partnerId, setPartnerId] = useState("")
  const [pct, setPct] = useState("")

  function escolherImovel(id: string) {
    setImovelId(id)
    const im = imoveis.find((p) => p.id === id)
    if (!im) return
    setPartnerId(im.partner_id ?? "")
    setPct(String(im.commission_percent ?? 0))
  }

  const imovel = imoveis.find((p) => p.id === imovelId)
  const base = Number(imovel?.rent_amount ?? 0)
  const pctNum = Math.min(100, Math.max(0, Number(pct) || 0))
  const comissao = round2((base * pctNum) / 100)
  const repasse = round2(base - comissao)

  return (
    <div style={{ background: "var(--purple-soft)", border: "1px solid var(--purple-border)", borderRadius: "10px", padding: "16px", marginBottom: "4px" }}>
      {imoveis.length > 0 && (
        <div style={{ marginBottom: "14px" }}>
          <Field label={<>Imóvel administrado<InfoTip text="Escolha o imóvel para preencher automaticamente o proprietário e o percentual de comissão cadastrados. Você ainda pode ajustar os dois abaixo." /></>}>
            <select value={imovelId} onChange={(e) => escolherImovel(e.target.value)} style={inp}>
              <option value="">— não é locação de imóvel —</option>
              {imoveis.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
        </div>
      )}

      <div style={grid2}>
        <Field label={<>Quem recebe o valor bruto<InfoTip text="Dono do valor desta cobrança. Escolhendo um parceiro (ex.: proprietário do imóvel), o valor menos a comissão é repasse a ele — essa parte não é receita da empresa. Deixe 'A própria empresa' para uma receita normal." /></>}>
          <select name="partner_id" value={partnerId} onChange={(e) => setPartnerId(e.target.value)} style={inp}>
            <option value="">A própria empresa (padrão)</option>
            {(o.partners ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label={<>Nossa comissão (%)<InfoTip text="Percentual do valor que fica com a empresa. O restante é repasse ao parceiro. Vem preenchido do cadastro do imóvel, mas pode ser ajustado aqui." /></>}>
          <input name="commission_percent" type="number" step="0.01" min="0" max="100"
            value={pct} onChange={(e) => setPct(e.target.value)}
            disabled={!partnerId} placeholder="10" style={{ ...inp, opacity: partnerId ? 1 : 0.5 }} />
        </Field>
      </div>

      <div style={{ ...grid2, marginTop: "12px" }}>
        <Field label={<>Juros / Multa (fica com a empresa)<InfoTip text="Juros e multa cobrados do cliente nesta parcela. Essa parte é receita da empresa e NÃO entra no repasse ao parceiro. Informe em R$ ou em % — no modo %, o percentual é aplicado sobre o Valor Total e convertido em R$ ao salvar." /></>}><InterestField color={color} /></Field>
      </div>

      {partnerId && base > 0 && (
        <div style={{ marginTop: "14px", padding: "12px 14px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "8px" }}>
          <div style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "8px" }}>
            Como fica a divisão (sobre o aluguel cadastrado de {brl(base)})
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "18px", fontSize: "12.5px" }}>
            <span style={{ color: "var(--success)" }}>Comissão da empresa ({pctNum}%): <strong>{brl(comissao)}</strong></span>
            <span style={{ color: "var(--purple)" }}>Repasse ao proprietário: <strong>{brl(repasse)}</strong></span>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "9px", alignItems: "flex-start", marginTop: "14px", padding: "11px 13px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "8px" }}>
        <Info size={14} style={{ color: "var(--purple)", flexShrink: 0, marginTop: "2px" }} />
        <span style={{ fontSize: "11.5px", color: "var(--text-secondary)", lineHeight: 1.65 }}>
          Com um parceiro selecionado, só a <strong>comissão</strong> e os <strong>juros/multa</strong> são receita da empresa. O restante é <strong>repasse</strong> ao parceiro — e vira uma conta a pagar automática quando a cobrança for recebida. Veja o total por parceiro no relatório <strong>Repasses por Parceiro</strong>.
        </span>
      </div>
    </div>
  )
}

export type Options = {
  categories: Cat[]; accounts: Acc[]; costCenters: Opt[]; customers: Opt[]; suppliers: Opt[]; products: Prod[]
  /* Recebedor parceiro (repasse) — presentes só quando a função está ligada em Configurações */
  partners?: Opt[]; partnerReceiversEnabled?: boolean
}

const PRACTICES: Record<string, string[]> = {
  receita: [
    "Sempre emita NF para receitas — facilita crédito e auditoria",
    "Preencha o centro de custo para saber qual obra é mais lucrativa",
    "Registre na data de competência (quando o serviço foi prestado)",
  ],
  despesa: [
    "Exija NF de fornecedores: dedução fiscal e rastreabilidade",
    "Rateie despesas administrativas entre obras no centro de custo",
    "Registre na data de competência, não só na data de pagamento",
  ],
  transferencia: [
    "Transferências não aparecem no DRE — não são receita nem despesa",
    "Use a descrição para identificar o propósito da transferência",
    "Guarde o comprovante para conciliação bancária",
  ],
}

const STATUS_LABEL: Record<string, { l: string; c: string }> = {
  a_receber: { l: "A Receber", c: "var(--accent)" }, recebido: { l: "Recebido", c: "var(--success)" },
  recebido_parcial: { l: "Parcial", c: "var(--accent)" }, a_pagar: { l: "A Pagar", c: "var(--text-secondary)" },
  pago: { l: "Pago", c: "var(--danger)" }, pago_parcial: { l: "Parcial", c: "var(--text-secondary)" },
  em_atraso: { l: "Em atraso", c: "var(--danger)" },
}

export default function TransactionsClient({ categories, accounts, costCenters, customers, suppliers, products, partners, partnerReceiversEnabled, recent }: Options & { recent: RecentEntry[] }) {
  const router = useRouter()
  const [tab, setTab] = useState<"receita" | "despesa" | "transferencia">("receita")
  const [formKey, setFormKey] = useState(0)
  const o: Options = { categories, accounts, costCenters, customers, suppliers, products, partners, partnerReceiversEnabled }
  const onSaved = () => router.refresh()
  const onNew = () => setFormKey((k) => k + 1)

  const tabs = [
    { k: "receita", l: "Receita", c: "var(--success)" },
    { k: "despesa", l: "Despesa", c: "var(--danger)" },
    { k: "transferencia", l: "Transferência", c: "var(--accent)" },
  ] as const

  return (
    <div style={{ padding: "22px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <Link href="/" style={{ width: "34px", height: "34px", borderRadius: "9px", border: "1px solid var(--border)", background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}><ChevronLeft size={17} /></Link>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>Novo Lançamento</h1>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>Registro financeiro com rastreabilidade completa</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: "20px", alignItems: "start" }}>
        <div>
          {/* abas */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", marginBottom: "18px" }}>
            {tabs.map((t) => {
              const on = tab === t.k
              return (
                <button key={t.k} onClick={() => { setTab(t.k); setFormKey((k) => k + 1) }} style={{
                  padding: "15px", borderRadius: "12px", cursor: "pointer", fontFamily: "inherit", fontSize: "14px", fontWeight: 700,
                  border: `1.5px solid ${on ? t.c : "var(--border)"}`, background: on ? `${t.c}12` : "var(--bg-secondary)", color: on ? t.c : "var(--text-secondary)",
                }}>{t.l}</button>
              )
            })}
          </div>

          {tab === "receita" && <FormReceita key={formKey} o={o} onSaved={onSaved} onNew={onNew} />}
          {tab === "despesa" && <FormDespesa key={formKey} o={o} onSaved={onSaved} onNew={onNew} />}
          {tab === "transferencia" && <FormTransferencia key={formKey} o={o} onSaved={onSaved} onNew={onNew} />}
        </div>

        {/* coluna lateral */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", position: "sticky", top: "16px" }}>
          <div style={{ ...card, padding: "18px" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "14px" }}>Últimos lançamentos</div>
            {recent.length === 0 && <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Nenhum lançamento ainda.</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: "13px" }}>
              {recent.map((r) => {
                const st = STATUS_LABEL[r.status] ?? { l: r.status, c: "var(--text-muted)" }
                const sign = r.kind === "receita" ? "+" : "−"
                const col = r.kind === "receita" ? "var(--success)" : "var(--danger)"
                return (
                  <div key={r.id} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: col, marginTop: "5px", flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.party ? `${r.party} — ` : ""}{r.description}</div>
                      <div style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "2px" }}>{r.date.split("-").reverse().join("/")}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: "12.5px", fontWeight: 700, color: col }}>{sign} {brl(r.amount)}</div>
                      <div style={{ fontSize: "10px", color: st.c, marginTop: "2px" }}>{st.l}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ ...card, padding: "18px" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "12px" }}>Boas Práticas</div>
            <ul style={{ margin: 0, paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "9px" }}>
              {PRACTICES[tab].map((p, i) => (
                <li key={i} style={{ fontSize: "11.5px", color: "var(--text-secondary)", lineHeight: 1.45 }}>{p}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
