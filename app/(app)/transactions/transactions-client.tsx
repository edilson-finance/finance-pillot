"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Upload, Plus, Trash2, X, Check as CheckIcon } from "lucide-react"
import Link from "next/link"
import { createReceita, createDespesa, createTransferencia } from "./actions"
import type { RecentEntry } from "@/lib/db/lancamentos"

type Opt = { id: string; name: string }
type Cat = Opt & { kind: string }
type Acc = Opt & { balance: number }
type Prod = Opt & { price: number; unit: string | null }

const today = () => new Date().toISOString().slice(0, 10)
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

// ── estilos base ─────────────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: "100%", padding: "9px 11px", background: "var(--bg-tertiary)",
  border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px",
  color: "var(--text-primary)", outline: "none", fontFamily: "inherit",
}
const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }

function Label({ children, req }: { children: string; req?: boolean }) {
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
function Field({ label, req, span, children }: { label: string; req?: boolean; span?: boolean; children: React.ReactNode }) {
  return <div style={span ? { gridColumn: "1 / -1" } : undefined}><Label req={req}>{label}</Label>{children}</div>
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
  return (
    <label style={{ display: "flex", alignItems: "center", gap: "9px", cursor: "pointer", fontSize: "13px", color: "var(--text-secondary)" }}>
      <span onClick={() => onChange(!checked)} style={{
        width: "18px", height: "18px", borderRadius: "5px", display: "flex", alignItems: "center", justifyContent: "center",
        border: `1.5px solid ${checked ? "var(--accent)" : "var(--border)"}`, background: checked ? "var(--accent)" : "transparent",
      }}>{checked && <CheckIcon size={12} color="#fff" />}</span>
      {label}
    </label>
  )
}

// ── upload de anexos ─────────────────────────────────────────────────────────
function Dropzone({ files, setFiles, accept }: { files: File[]; setFiles: (f: File[]) => void; accept: string }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div>
      <div onClick={() => ref.current?.click()} style={{
        border: "1.5px dashed var(--border)", borderRadius: "10px", padding: "22px", textAlign: "center", cursor: "pointer",
      }}>
        <Upload size={20} style={{ color: "var(--text-muted)", marginBottom: "6px" }} />
        <div style={{ fontSize: "12.5px", color: "var(--text-secondary)" }}>
          Arraste ou <span style={{ color: "var(--accent)", fontWeight: 600 }}>clique para selecionar</span>
        </div>
        <div style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "3px" }}>{accept} · Máx 10MB</div>
      </div>
      <input ref={ref} type="file" name="attachments" multiple hidden
        onChange={(e) => setFiles([...(e.target.files ? Array.from(e.target.files) : [])])} />
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
function Actions({ label, color, saving, onKeepNew }: { label: string; color: string; saving: boolean; onKeepNew: () => void }) {
  const router = useRouter()
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "10px", marginTop: "24px" }}>
      <button type="submit" disabled={saving} style={{ padding: "13px", background: color, border: "none", borderRadius: "10px", fontSize: "13.5px", color: "#fff", fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1, fontFamily: "inherit" }}>
        {saving ? "Salvando..." : label}
      </button>
      <button type="submit" disabled={saving} onClick={onKeepNew} style={{ padding: "13px 18px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "10px", fontSize: "13px", color: "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>
        Salvar e novo
      </button>
      <button type="button" onClick={() => router.push("/")} style={{ padding: "13px 18px", background: "transparent", border: "1px solid var(--border)", borderRadius: "10px", fontSize: "13px", color: "var(--text-muted)", cursor: "pointer", fontFamily: "inherit" }}>
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
function useSubmit(action: (fd: FormData) => Promise<{ error: string | null }>, onDone: () => void) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const keepNew = useRef(false)
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true); setError(null); setOk(false)
    const res = await action(new FormData(e.currentTarget))
    setSaving(false)
    if (res.error) { setError(res.error) }
    else { setOk(true); onDone() }
  }
  return { saving, error, ok, keepNew, onSubmit }
}

const card: React.CSSProperties = { background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "14px", padding: "26px" }

// ════════════════════════ RECEITA ════════════════════════
function FormReceita({ o, onDone }: { o: Options; onDone: () => void }) {
  const C = "var(--success)"
  const { saving, error, ok, keepNew, onSubmit } = useSubmit(createReceita, onDone)
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
        <Field label="Valor Total" req><input name="amount" type="number" step="0.01" min="0" required placeholder="0,00" style={inp} /></Field>
        <Field label="Data de Vencimento / Entrega" req><input name="due_date" type="date" required defaultValue={today()} style={inp} /></Field>
        <Field label="Descrição da Receita" req span><input name="description" required placeholder="Ex: Medição 12 — Obra 07 / Prestação de serviço" style={inp} /></Field>
        <Field label="Data de Competência"><input name="competence_date" type="date" defaultValue={today()} style={inp} /></Field>
        <Field label="Número NF / Documento"><input name="document_number" placeholder="NF-000123 / Contrato 007" style={inp} /></Field>
        <Field label="Conta de Destino" req>
          <select name="account_id" required style={inp}><option value="">Selecione...</option>{o.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
        </Field>
        <Field label="Categoria da Receita" req>
          <select name="category_id" required style={inp}><option value="">Selecione...</option>{o.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </Field>
        <Field label="Centro de Custo / Obra">
          <select name="cost_center_id" style={inp}><option value="">Nenhum</option>{o.costCenters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </Field>
      </div>

      <Section>Cliente</Section>
      <div style={grid2}>
        <Field label="Cliente" req span>
          <input name="customer_name" list="cust-list" required placeholder="Buscar cliente cadastrado ou digitar nome..." style={inp} />
          <datalist id="cust-list">{o.customers.map((c) => <option key={c.id} value={c.name} />)}</datalist>
        </Field>
        <Field label="CPF / CNPJ"><input name="counterparty_doc" placeholder="00.000.000/0001-00" style={inp} /></Field>
        <Field label="Contato (telefone / whatsapp)"><input name="contact" placeholder="(11) 99999-9999" style={inp} /></Field>
        <Field label="E-mail para envio de recibo"><input name="email" type="email" placeholder="financeiro@cliente.com.br" style={inp} /></Field>
        <Field label="Prazo de Pagamento (dias)"><input name="payment_term_days" type="number" min="0" placeholder="30" style={inp} /></Field>
      </div>

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

      <Banner error={error} ok={ok} />
      <Actions label="Salvar Receita" color={C} saving={saving} onKeepNew={() => (keepNew.current = true)} />
    </form>
  )
}

// ════════════════════════ DESPESA ════════════════════════
function FormDespesa({ o, onDone }: { o: Options; onDone: () => void }) {
  const C = "var(--danger)"
  const { saving, error, ok, keepNew, onSubmit } = useSubmit(createDespesa, onDone)
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
        <Field label="Valor Total" req><input name="amount" type="number" step="0.01" min="0" required placeholder="0,00" style={inp} /></Field>
        <Field label="Data de Vencimento" req><input name="due_date" type="date" required defaultValue={today()} style={inp} /></Field>
        <Field label="Descrição da Despesa" req span><input name="description" required placeholder="Ex: Folha de maio / Aluguel escritório / Material Obra 07" style={inp} /></Field>
        <Field label="Data de Competência"><input name="competence_date" type="date" defaultValue={today()} style={inp} /></Field>
        <Field label="Nº Nota Fiscal / Boleto"><input name="document_number" placeholder="NF 000456 / Código de barras" style={inp} /></Field>
        <Field label="Conta de Pagamento" req>
          <select name="account_id" required style={inp}><option value="">Selecione...</option>{o.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
        </Field>
        <Field label="Categoria da Despesa" req>
          <select name="category_id" required style={inp}><option value="">Selecione...</option>{o.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </Field>
        <Field label="Centro de Custo / Departamento">
          <select name="cost_center_id" style={inp}><option value="">Nenhum</option>{o.costCenters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </Field>
      </div>

      <Section>Fornecedor</Section>
      <div style={grid2}>
        <Field label="Fornecedor" req span>
          <input name="supplier_name" list="supp-list" required placeholder="Buscar fornecedor cadastrado..." style={inp} />
          <datalist id="supp-list">{o.suppliers.map((s) => <option key={s.id} value={s.name} />)}</datalist>
        </Field>
        <Field label="CPF / CNPJ"><input name="counterparty_doc" placeholder="00.000.000/0001-00" style={inp} /></Field>
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
        <Field label="Juros / Multa R$"><input name="interest" type="number" step="0.01" min="0" placeholder="0,00" style={inp} /></Field>
        <Field label="Desconto Obtido R$"><input name="discount" type="number" step="0.01" min="0" placeholder="0,00" style={inp} /></Field>
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

      <Banner error={error} ok={ok} />
      <Actions label="Salvar Despesa" color={C} saving={saving} onKeepNew={() => (keepNew.current = true)} />
    </form>
  )
}

// ════════════════════════ TRANSFERÊNCIA ════════════════════════
function FormTransferencia({ o, onDone }: { o: Options; onDone: () => void }) {
  const C = "var(--accent)"
  const { saving, error, ok, keepNew, onSubmit } = useSubmit(createTransferencia, onDone)
  const [tt, setTt] = useState("PIX")
  const [files, setFiles] = useState<File[]>([])
  return (
    <form onSubmit={onSubmit} style={card}>
      <Section>Dados da Transferência</Section>
      <div style={grid2}>
        <Field label="Valor" req><input name="amount" type="number" step="0.01" min="0" required placeholder="0,00" style={inp} /></Field>
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
        <Field label="Tarifa Bancária R$"><input name="fee" type="number" step="0.01" min="0" placeholder="0,00" style={inp} /></Field>
        <Field label="IOF / Imposto R$"><input name="tax" type="number" step="0.01" min="0" placeholder="0,00" style={inp} /></Field>
      </div>
      <div style={{ marginTop: "16px", padding: "13px 15px", borderRadius: "9px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
        <strong style={{ color: "var(--text-primary)" }}>Importante</strong><br />
        Transferências entre contas da mesma empresa <strong>não impactam o DRE</strong> nem o fluxo operacional — apenas movimentam o saldo entre contas.
      </div>
      <div style={{ height: "16px" }} />
      <Label>Comprovante</Label>
      <Dropzone files={files} setFiles={setFiles} accept="PDF, JPG, PNG" />

      <Banner error={error} ok={ok} />
      <Actions label="Salvar Transferência" color={C} saving={saving} onKeepNew={() => (keepNew.current = true)} />
    </form>
  )
}

// ── tipos das opções ─────────────────────────────────────────────────────────
type Options = {
  categories: Cat[]; accounts: Acc[]; costCenters: Opt[]; customers: Opt[]; suppliers: Opt[]; products: Prod[]
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

export default function TransactionsClient({ categories, accounts, costCenters, customers, suppliers, products, recent }: Options & { recent: RecentEntry[] }) {
  const router = useRouter()
  const [tab, setTab] = useState<"receita" | "despesa" | "transferencia">("receita")
  const [formKey, setFormKey] = useState(0)
  const o: Options = { categories, accounts, costCenters, customers, suppliers, products }
  const onDone = () => { router.refresh(); setTimeout(() => setFormKey((k) => k + 1), 1200) }

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

          {tab === "receita" && <FormReceita key={formKey} o={o} onDone={onDone} />}
          {tab === "despesa" && <FormDespesa key={formKey} o={o} onDone={onDone} />}
          {tab === "transferencia" && <FormTransferencia key={formKey} o={o} onDone={onDone} />}
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
