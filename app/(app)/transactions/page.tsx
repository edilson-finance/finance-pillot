"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Upload, Plus, Search, ChevronLeft, AlertCircle } from "lucide-react"

/* ── shared styles ── */
const inp: React.CSSProperties = {
  width:"100%", padding:"9px 12px",
  background:"var(--bg-tertiary)", border:"1px solid var(--border)",
  borderRadius:"6px", fontSize:"12.5px", color:"var(--text-primary)",
  outline:"none", fontFamily:"inherit",
}

function F({ label, required, half, full, children }: { label:string; required?:boolean; half?:boolean; full?:boolean; children:React.ReactNode }) {
  return (
    <div style={{ gridColumn: full?"1 / -1": half?"span 1":"span 2", marginBottom:"12px" }}>
      <label style={{ display:"block",fontSize:"10.5px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.5px" }}>
        {label}{required&&<span style={{ color:"var(--danger)" }}> *</span>}
      </label>
      {children}
    </div>
  )
}

function Sec({ title }: { title:string }) {
  return (
    <div style={{ gridColumn:"1 / -1", paddingTop:"14px", marginBottom:"4px", borderTop:"1px solid var(--border)" }}>
      <div style={{ fontSize:"10px",fontWeight:800,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.8px" }}>{title}</div>
    </div>
  )
}

/* ── Receita form ── */
function ReceitaForm() {
  const [parcelado, setParcelado] = useState(false)
  const [recorrente, setRecorrente] = useState(false)
  const [qtdParc, setQtdParc] = useState(2)
  const [status, setStatus] = useState("a_receber")
  const [addItem, setAddItem] = useState(false)
  const [qty, setQty] = useState("1")
  const [vUnit, setVUnit] = useState("")
  const [desc, setDesc] = useState("")
  const [payMethod, setPayMethod] = useState("")
  const total = (parseFloat(vUnit.replace(",","."))||0)*(parseFloat(qty)||1)-(parseFloat(desc.replace(",","."))||0)

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 18px" }}>
      <Sec title="Identificação da Receita"/>

      <F label="Valor Total" required half>
        <div style={{ position:"relative" }}>
          <span style={{ position:"absolute",left:"10px",top:"50%",transform:"translateY(-50%)",fontSize:"12px",color:"var(--text-muted)",fontWeight:600 }}>R$</span>
          <input type="text" placeholder="0,00" style={{ ...inp, paddingLeft:"32px" }}/>
        </div>
      </F>
      <F label="Data de Vencimento / Entrega" required half>
        <input type="date" defaultValue="2026-05-09" style={inp}/>
      </F>
      <F label="Descrição da Receita" required>
        <input type="text" placeholder="Ex: Medição 12 — Obra 07 / Prestação de serviço" style={inp}/>
      </F>
      <F label="Data de Competência" half>
        <input type="date" defaultValue="2026-05-09" style={inp}/>
      </F>
      <F label="Número NF / Documento" half>
        <input type="text" placeholder="NF-000123 / Contrato 007" style={inp}/>
      </F>
      <F label="Conta de Destino" required half>
        <select style={inp}>
          <option>Bradesco Conta Corrente</option>
          <option>Itaú Conta Corrente</option>
          <option>Nubank PJ</option>
        </select>
      </F>
      <F label="Categoria da Receita" required half>
        <div style={{ display:"flex",gap:"6px" }}>
          <select style={{ ...inp, flex:1 }}>
            <option>Receita de Obras</option>
            <option>Contratos Mensais</option>
            <option>Serviços Avulsos</option>
            <option>Projetos e Consultoria</option>
            <option>Aluguéis Recebidos</option>
            <option>Juros Recebidos</option>
          </select>
          <button style={{ padding:"9px 10px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",cursor:"pointer",color:"var(--text-secondary)" }}>
            <Plus size={13}/>
          </button>
        </div>
      </F>
      <F label="Centro de Custo / Obra" half>
        <select style={inp}>
          <option>Nenhum</option>
          <option>Obra 07 — Construtora Beta</option>
          <option>Obra 09 — J. Silva</option>
          <option>Administrativo</option>
        </select>
      </F>

      <Sec title="Cliente"/>
      <F label="Cliente" required>
        <div style={{ position:"relative" }}>
          <Search size={13} style={{ position:"absolute",left:"10px",top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)" }}/>
          <input type="text" placeholder="Buscar cliente cadastrado ou digitar nome..." style={{ ...inp,paddingLeft:"30px" }}/>
        </div>
      </F>
      <F label="CPF / CNPJ" half><input type="text" placeholder="00.000.000/0001-00" style={inp}/></F>
      <F label="Contato (Telefone / WhatsApp)" half><input type="text" placeholder="(11) 99999-9999" style={inp}/></F>
      <F label="E-mail para envio de recibo" half><input type="email" placeholder="financeiro@cliente.com.br" style={inp}/></F>
      <F label="Prazo de Pagamento (dias)" half><input type="number" placeholder="30" style={inp}/></F>

      <Sec title="Produto / Serviço"/>
      <div style={{ gridColumn:"1 / -1", marginBottom:"10px" }}>
        <label style={{ display:"flex",alignItems:"center",gap:"8px",cursor:"pointer",fontSize:"12px",color:"var(--text-secondary)" }}>
          <input type="checkbox" checked={addItem} onChange={e=>setAddItem(e.target.checked)} style={{ width:"14px",height:"14px" }}/>
          Detalhar produto ou serviço vendido
        </label>
      </div>
      {addItem && <>
        <F label="Produto / Serviço">
          <input type="text" placeholder="Buscar catálogo ou descrever livremente" style={inp}/>
        </F>
        <div style={{ gridColumn:"1 / -1", display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"12px", marginBottom:"12px" }}>
          {[
            { l:"Quantidade",    v:qty,  fn:setQty,  ph:"1",    t:"number" },
            { l:"Unidade",       v:"",   fn:()=>{},  ph:"Un / m² / hora", t:"text" },
            { l:"Valor Unit. R$",v:vUnit,fn:setVUnit,ph:"0,00", t:"text" },
            { l:"Desconto R$",   v:desc, fn:setDesc, ph:"0,00", t:"text" },
          ].map(f=>(
            <div key={f.l}>
              <label style={{ display:"block",fontSize:"10px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"4px",textTransform:"uppercase",letterSpacing:"0.4px" }}>{f.l}</label>
              <input type={f.t} value={f.v} onChange={e=>f.fn(e.target.value)} placeholder={f.ph} style={inp}/>
            </div>
          ))}
        </div>
        <div style={{ gridColumn:"1 / -1", marginBottom:"12px" }}>
          <div style={{ background:"var(--bg-tertiary)",borderRadius:"6px",padding:"12px 16px",border:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <span style={{ fontSize:"12px",color:"var(--text-secondary)" }}>Valor Total Calculado</span>
            <span style={{ fontSize:"19px",fontWeight:800,color:"var(--success)" }}>R$ {total.toLocaleString("pt-BR",{minimumFractionDigits:2})}</span>
          </div>
        </div>
      </>}

      <Sec title="Recebimento"/>
      <F label="Forma de Recebimento" full>
        <div style={{ display:"flex",flexWrap:"wrap",gap:"6px" }}>
          {["PIX","Boleto","TED/DOC","Cheque","Cartão Débito","Cartão Crédito","Dinheiro","Depósito","Outro"].map(m=>(
            <button key={m} onClick={()=>setPayMethod(payMethod===m?"":m)} style={{
              padding:"6px 14px",border:"1px solid",
              borderColor: payMethod===m ? "var(--success)" : "var(--border)",
              borderRadius:"20px",
              background: payMethod===m ? "var(--success-soft)" : "var(--bg-tertiary)",
              fontSize:"12px", color: payMethod===m ? "var(--success)" : "var(--text-secondary)",
              fontWeight: payMethod===m ? 700 : 400,
              cursor:"pointer", fontFamily:"inherit",
              transition:"all 0.12s",
            }}>{m}</button>
          ))}
        </div>
        {!payMethod && <div style={{ fontSize:"10px",color:"var(--danger)",marginTop:"4px" }}>Selecione uma forma de recebimento</div>}
      </F>
      <F label="Status" full>
        <div style={{ display:"flex",gap:"6px" }}>
          {[["a_receber","A Receber","var(--accent)"],["recebido","Recebido","var(--success)"],["pago_parcialmente","Parcialmente Recebido","var(--warning)"]].map(([k,l,c])=>(
            <button key={k as string} onClick={()=>setStatus(k as string)} style={{ flex:1,padding:"8px",border:`1px solid ${status===k?c:"var(--border)"}`,borderRadius:"6px",background:status===k?`${c}22`:"transparent",color:status===k?c:"var(--text-secondary)",fontSize:"11.5px",fontWeight:status===k?700:400,cursor:"pointer",fontFamily:"inherit" }}>
              {l as string}
            </button>
          ))}
        </div>
      </F>
      {(status==="recebido"||status==="pago_parcialmente") && (
        <>
          <F label="Data de Recebimento" half><input type="date" defaultValue="2026-05-09" style={inp}/></F>
          {status==="pago_parcialmente" && <F label="Valor Recebido R$" half><input type="text" placeholder="0,00" style={inp}/></F>}
        </>
      )}

      <Sec title="Parcelamento"/>
      <div style={{ gridColumn:"1 / -1",display:"flex",gap:"20px",marginBottom:"10px" }}>
        <label style={{ display:"flex",alignItems:"center",gap:"8px",cursor:"pointer",fontSize:"12px",color:"var(--text-secondary)" }}>
          <input type="checkbox" checked={parcelado} onChange={e=>{setParcelado(e.target.checked);setRecorrente(false)}} style={{ width:"14px",height:"14px" }}/>
          Parcelado (ex: medições mensais)
        </label>
        <label style={{ display:"flex",alignItems:"center",gap:"8px",cursor:"pointer",fontSize:"12px",color:"var(--text-secondary)" }}>
          <input type="checkbox" checked={recorrente} onChange={e=>{setRecorrente(e.target.checked);setParcelado(false)}} style={{ width:"14px",height:"14px" }}/>
          Recorrente (contrato fixo)
        </label>
      </div>
      {parcelado && (
        <>
          <F label="Número de Parcelas" half>
            <input
              type="number" min="2" max="60" value={qtdParc}
              onChange={e => setQtdParc(Math.max(2, Math.min(60, parseInt(e.target.value)||2)))}
              placeholder="Ex: 12"
              style={inp}
            />
          </F>
          <F label="Periodicidade" half>
            <select style={inp}><option>Mensal</option><option>Quinzenal</option><option>Semanal</option><option>Bimestral</option></select>
          </F>
          <F label="Primeira Parcela" half><input type="date" defaultValue="2026-05-09" style={inp}/></F>
          <div style={{ gridColumn:"span 1" }}>
            <div style={{ fontSize:"10px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"5px" }}>Preview das Parcelas</div>
            <div style={{ background:"var(--bg-tertiary)",borderRadius:"6px",padding:"8px 10px",border:"1px solid var(--border)",maxHeight:"72px",overflowY:"auto" }}>
              {Array.from({length:Math.min(qtdParc,5)}).map((_,i)=>(
                <div key={i} style={{ display:"flex",justifyContent:"space-between",fontSize:"11px",color:"var(--text-secondary)",marginBottom:"2px" }}>
                  <span>Parcela {i+1}/{qtdParc}</span>
                  <span style={{ color:"var(--success)",fontWeight:600 }}>R$ {(total/qtdParc||0).toFixed(2)}</span>
                </div>
              ))}
              {qtdParc>5 && <div style={{ fontSize:"10px",color:"var(--text-muted)",textAlign:"center" }}>+ {qtdParc-5} mais...</div>}
            </div>
          </div>
        </>
      )}
      {recorrente && (
        <>
          <F label="Frequência" half><select style={inp}><option>Mensal</option><option>Quinzenal</option><option>Semanal</option><option>Anual</option></select></F>
          <F label="Vigência até" half>
            <div style={{ display:"flex",gap:"6px" }}>
              <input type="date" style={{ ...inp,flex:1 }}/>
              <button style={{ padding:"9px 10px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",cursor:"pointer",fontSize:"11px",color:"var(--text-muted)",fontFamily:"inherit" }}>Indeterminado</button>
            </div>
          </F>
        </>
      )}

      <Sec title="Extras"/>
      <F label="Observações"><textarea placeholder="Referências do contrato, condições especiais..." style={{ ...inp,resize:"vertical",minHeight:"60px" }}/></F>
      <div style={{ gridColumn:"1 / -1" }}>
        <div style={{ fontSize:"10.5px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.5px" }}>Anexos (NF, boleto, comprovante)</div>
        <div style={{ border:"2px dashed var(--border)",borderRadius:"6px",padding:"14px",textAlign:"center",background:"var(--bg-tertiary)" }}>
          <Upload size={16} style={{ color:"var(--text-muted)",marginBottom:"4px" }}/>
          <div style={{ fontSize:"11px",color:"var(--text-secondary)" }}>Arraste ou <span style={{ color:"var(--accent)",cursor:"pointer" }}>clique para selecionar</span></div>
          <div style={{ fontSize:"10px",color:"var(--text-muted)",marginTop:"2px" }}>PDF, JPG, PNG, XML · Máx 10MB</div>
        </div>
      </div>
    </div>
  )
}

/* ── Despesa form ── */
function DespesaForm() {
  const [parcelado, setParcelado] = useState(false)
  const [recorrente, setRecorrente] = useState(false)
  const [status, setStatus] = useState("a_pagar")
  const [addItem, setAddItem] = useState(false)
  const [payMethod, setPayMethod] = useState("")
  const [qtdParcDesp, setQtdParcDesp] = useState(2)

  return (
    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 18px" }}>
      <Sec title="Identificação da Despesa"/>
      <F label="Valor Total" required half>
        <div style={{ position:"relative" }}>
          <span style={{ position:"absolute",left:"10px",top:"50%",transform:"translateY(-50%)",fontSize:"12px",color:"var(--text-muted)",fontWeight:600 }}>R$</span>
          <input type="text" placeholder="0,00" style={{ ...inp,paddingLeft:"32px" }}/>
        </div>
      </F>
      <F label="Data de Vencimento" required half>
        <input type="date" defaultValue="2026-05-09" style={inp}/>
      </F>
      <F label="Descrição da Despesa" required>
        <input type="text" placeholder="Ex: Folha de maio / Aluguel escritório / Material Obra 07" style={inp}/>
      </F>
      <F label="Data de Competência" half>
        <input type="date" defaultValue="2026-05-09" style={inp}/>
      </F>
      <F label="Nº Nota Fiscal / Boleto" half>
        <input type="text" placeholder="NF 000456 / Código de barras" style={inp}/>
      </F>
      <F label="Conta de Pagamento" required half>
        <select style={inp}>
          <option>Bradesco Conta Corrente</option>
          <option>Itaú Conta Corrente</option>
          <option>Nubank PJ</option>
          <option>Caixa Físico</option>
        </select>
      </F>
      <F label="Categoria da Despesa" required half>
        <div style={{ display:"flex",gap:"6px" }}>
          <select style={{ ...inp,flex:1 }}>
            <optgroup label="Custos Variáveis">
              <option>Materiais e Insumos</option>
              <option>Subempreiteiros e Terceiros</option>
              <option>Mão de Obra Direta</option>
              <option>Fretes e Transportes</option>
              <option>Comissões de Vendas</option>
            </optgroup>
            <optgroup label="Despesas Fixas">
              <option>Folha de Pagamento</option>
              <option>Pró-labore dos Sócios</option>
              <option>Aluguel e Condomínio</option>
              <option>Energia e Água</option>
              <option>Telecom e Internet</option>
              <option>Seguros</option>
              <option>Manutenção e Conservação</option>
            </optgroup>
            <optgroup label="Despesas Administrativas">
              <option>Honorários Contábeis</option>
              <option>Assinaturas e Softwares</option>
              <option>Material de Escritório</option>
              <option>Viagens e Representação</option>
            </optgroup>
            <optgroup label="Impostos e Encargos">
              <option>Impostos sobre Receita (DAS/DARF)</option>
              <option>FGTS e Encargos Trabalhistas</option>
              <option>IPTU / IPVA</option>
            </optgroup>
            <optgroup label="Despesas Financeiras">
              <option>Juros e IOF de Empréstimos</option>
              <option>Taxas Bancárias</option>
              <option>Multas e Juros de Mora</option>
            </optgroup>
          </select>
          <button style={{ padding:"9px 10px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",cursor:"pointer",color:"var(--text-secondary)" }}>
            <Plus size={13}/>
          </button>
        </div>
      </F>
      <F label="Centro de Custo / Departamento" half>
        <select style={inp}>
          <option>Nenhum</option>
          <option>Obra 07 — Construtora Beta</option>
          <option>Obra 09 — J. Silva</option>
          <option>Administrativo</option>
          <option>Comercial</option>
        </select>
      </F>

      <Sec title="Fornecedor"/>
      <F label="Fornecedor" required>
        <div style={{ position:"relative" }}>
          <Search size={13} style={{ position:"absolute",left:"10px",top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)" }}/>
          <input type="text" placeholder="Buscar fornecedor cadastrado..." style={{ ...inp,paddingLeft:"30px" }}/>
        </div>
      </F>
      <F label="CPF / CNPJ" half><input type="text" placeholder="00.000.000/0001-00" style={inp}/></F>
      <F label="Dados Bancários / PIX" half><input type="text" placeholder="Chave PIX, banco, agência, conta" style={inp}/></F>

      <Sec title="Produto / Serviço Adquirido"/>
      <div style={{ gridColumn:"1 / -1",marginBottom:"10px" }}>
        <label style={{ display:"flex",alignItems:"center",gap:"8px",cursor:"pointer",fontSize:"12px",color:"var(--text-secondary)" }}>
          <input type="checkbox" checked={addItem} onChange={e=>setAddItem(e.target.checked)} style={{ width:"14px",height:"14px" }}/>
          Detalhar itens comprados
        </label>
      </div>
      {addItem && (
        <div style={{ gridColumn:"1 / -1",display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:"10px",marginBottom:"12px" }}>
          {[
            { l:"Descrição do Item", ph:"Ex: Aço CA-50 10mm", t:"text" },
            { l:"Quantidade",        ph:"100",                  t:"number" },
            { l:"Unidade",           ph:"Kg / m / sacos",       t:"text" },
            { l:"Valor Unitário R$", ph:"0,00",                 t:"text" },
          ].map(f=>(
            <div key={f.l}>
              <label style={{ display:"block",fontSize:"10px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"4px",textTransform:"uppercase",letterSpacing:"0.4px" }}>{f.l}</label>
              <input type={f.t} placeholder={f.ph} style={inp}/>
            </div>
          ))}
        </div>
      )}

      <Sec title="Pagamento"/>
      <F label="Forma de Pagamento" full>
        <div style={{ display:"flex",flexWrap:"wrap",gap:"6px" }}>
          {["PIX","Boleto","TED/DOC","Débito Automático","Cheque","Cartão Crédito PJ","Dinheiro","Nota Promissória"].map(m=>(
            <button key={m} onClick={()=>setPayMethod(payMethod===m?"":m)} style={{
              padding:"6px 14px", border:"1px solid",
              borderColor: payMethod===m ? "var(--danger)" : "var(--border)",
              borderRadius:"20px",
              background: payMethod===m ? "var(--danger-soft)" : "var(--bg-tertiary)",
              fontSize:"12px", color: payMethod===m ? "var(--danger)" : "var(--text-secondary)",
              fontWeight: payMethod===m ? 700 : 400,
              cursor:"pointer", fontFamily:"inherit", transition:"all 0.12s",
            }}>{m}</button>
          ))}
        </div>
        {!payMethod && <div style={{ fontSize:"10px",color:"var(--danger)",marginTop:"4px" }}>Selecione uma forma de pagamento</div>}
      </F>
      <F label="Status" full>
        <div style={{ display:"flex",gap:"6px" }}>
          {[["a_pagar","A Pagar","var(--accent)"],["pago","Pago","var(--success)"],["pago_parcialmente","Pago Parcialmente","var(--warning)"]].map(([k,l,c])=>(
            <button key={k as string} onClick={()=>setStatus(k as string)} style={{ flex:1,padding:"8px",border:`1px solid ${status===k?c:"var(--border)"}`,borderRadius:"6px",background:status===k?`${c}22`:"transparent",color:status===k?c:"var(--text-secondary)",fontSize:"11.5px",fontWeight:status===k?700:400,cursor:"pointer",fontFamily:"inherit" }}>
              {l as string}
            </button>
          ))}
        </div>
      </F>
      {(status==="pago"||status==="pago_parcialmente") && (
        <>
          <F label="Data de Pagamento" half><input type="date" defaultValue="2026-05-09" style={inp}/></F>
          {status==="pago_parcialmente" && <F label="Valor Pago R$" half><input type="text" placeholder="0,00" style={inp}/></F>}
        </>
      )}
      <F label="Juros / Multa R$" half><input type="text" placeholder="0,00" style={inp}/></F>
      <F label="Desconto Obtido R$" half><input type="text" placeholder="0,00" style={inp}/></F>

      <Sec title="Parcelamento e Recorrência"/>
      <div style={{ gridColumn:"1 / -1",display:"flex",gap:"20px",marginBottom:"10px" }}>
        <label style={{ display:"flex",alignItems:"center",gap:"8px",cursor:"pointer",fontSize:"12px",color:"var(--text-secondary)" }}>
          <input type="checkbox" checked={parcelado} onChange={e=>{setParcelado(e.target.checked);setRecorrente(false)}} style={{ width:"14px",height:"14px" }}/>
          Parcelado
        </label>
        <label style={{ display:"flex",alignItems:"center",gap:"8px",cursor:"pointer",fontSize:"12px",color:"var(--text-secondary)" }}>
          <input type="checkbox" checked={recorrente} onChange={e=>{setRecorrente(e.target.checked);setParcelado(false)}} style={{ width:"14px",height:"14px" }}/>
          Recorrente (aluguel, assinatura, etc.)
        </label>
      </div>
      {parcelado && (
        <>
          <F label="Número de Parcelas" half>
            <input type="number" min="2" max="60" value={qtdParcDesp}
              onChange={e=>setQtdParcDesp(Math.max(2,Math.min(60,parseInt(e.target.value)||2)))}
              placeholder="Ex: 12" style={inp}/>
          </F>
          <F label="Periodicidade" half>
            <select style={inp}><option>Mensal</option><option>Quinzenal</option><option>Semanal</option></select>
          </F>
          <F label="1ª Parcela" half><input type="date" defaultValue="2026-05-09" style={inp}/></F>
        </>
      )}
      {recorrente && (
        <>
          <F label="Frequência" half><select style={inp}><option>Mensal</option><option>Quinzenal</option><option>Semanal</option><option>Anual</option></select></F>
          <F label="Vigência" half>
            <div style={{ display:"flex",gap:"6px" }}>
              <input type="date" style={{ ...inp,flex:1 }}/>
              <button style={{ padding:"9px 10px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"6px",cursor:"pointer",fontSize:"11px",color:"var(--text-muted)",fontFamily:"inherit" }}>Indeterminado</button>
            </div>
          </F>
        </>
      )}

      <Sec title="Extras"/>
      <F label="Observações"><textarea placeholder="Condições negociadas, referências do pedido de compra..." style={{ ...inp,resize:"vertical",minHeight:"60px" }}/></F>
      <div style={{ gridColumn:"1 / -1" }}>
        <div style={{ fontSize:"10.5px",fontWeight:700,color:"var(--text-secondary)",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.5px" }}>Anexos (NF, boleto, comprovante)</div>
        <div style={{ border:"2px dashed var(--border)",borderRadius:"6px",padding:"14px",textAlign:"center",background:"var(--bg-tertiary)" }}>
          <Upload size={16} style={{ color:"var(--text-muted)",marginBottom:"4px" }}/>
          <div style={{ fontSize:"11px",color:"var(--text-secondary)" }}>Arraste ou <span style={{ color:"var(--accent)",cursor:"pointer" }}>clique para selecionar</span></div>
          <div style={{ fontSize:"10px",color:"var(--text-muted)",marginTop:"2px" }}>PDF, JPG, PNG, XML · Máx 10MB</div>
        </div>
      </div>
    </div>
  )
}

/* ── Transferência form ── */
function TransferenciaForm() {
  return (
    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 18px" }}>
      <Sec title="Dados da Transferência"/>
      <F label="Valor" required half>
        <div style={{ position:"relative" }}>
          <span style={{ position:"absolute",left:"10px",top:"50%",transform:"translateY(-50%)",fontSize:"12px",color:"var(--text-muted)",fontWeight:600 }}>R$</span>
          <input type="text" placeholder="0,00" style={{ ...inp,paddingLeft:"32px" }}/>
        </div>
      </F>
      <F label="Data" required half><input type="date" defaultValue="2026-05-09" style={inp}/></F>
      <F label="Conta de Origem" required half>
        <select style={inp}>
          <option>Bradesco Conta Corrente — R$ 198.400</option>
          <option>Itaú Conta Corrente — R$ 62.800</option>
          <option>Nubank PJ — R$ 23.550</option>
          <option>Caixa Físico — R$ 4.200</option>
        </select>
      </F>
      <F label="Conta de Destino" required half>
        <select style={inp}>
          <option>Nubank PJ — R$ 23.550</option>
          <option>Bradesco Conta Corrente — R$ 198.400</option>
          <option>Itaú Conta Corrente — R$ 62.800</option>
          <option>Caixa Físico — R$ 4.200</option>
          <option>Conta bancária externa (terceiro)</option>
        </select>
      </F>
      <F label="Tipo de Transferência" half>
        <select style={inp}>
          <option>PIX</option>
          <option>TED</option>
          <option>DOC</option>
          <option>Transferência interna</option>
          <option>Saque / depósito</option>
          <option>Retirada de sócio</option>
          <option>Aporte de sócio</option>
        </select>
      </F>
      <F label="Nº Comprovante" half><input type="text" placeholder="Nº TED / PIX / EndToEnd" style={inp}/></F>
      <F label="Descrição"><input type="text" placeholder="Ex: Transferência para caixa / Retirada pró-labore" style={inp}/></F>

      <Sec title="Taxas (se houver)"/>
      <F label="Tarifa Bancária R$" half><input type="text" placeholder="0,00" style={inp}/></F>
      <F label="IOF / Imposto R$" half><input type="text" placeholder="0,00" style={inp}/></F>

      <div style={{ gridColumn:"1 / -1" }}>
        <div style={{ background:"var(--bg-tertiary)",borderRadius:"8px",padding:"12px 14px",border:"1px solid var(--border)" }}>
          <div style={{ display:"flex",alignItems:"center",gap:"7px",marginBottom:"4px" }}>
            <AlertCircle size={13} style={{ color:"var(--warning)" }}/>
            <span style={{ fontSize:"11px",fontWeight:700,color:"var(--warning)" }}>Importante</span>
          </div>
          <div style={{ fontSize:"11px",color:"var(--text-secondary)",lineHeight:1.6 }}>
            Transferências entre contas da mesma empresa <strong>não impactam o DRE</strong> nem o fluxo operacional — apenas movimentam o saldo entre contas. Retiradas de sócios são registradas abaixo do resultado operacional.
          </div>
        </div>
      </div>

      <Sec title="Comprovante"/>
      <div style={{ gridColumn:"1 / -1" }}>
        <div style={{ border:"2px dashed var(--border)",borderRadius:"6px",padding:"14px",textAlign:"center",background:"var(--bg-tertiary)" }}>
          <Upload size={16} style={{ color:"var(--text-muted)",marginBottom:"4px" }}/>
          <div style={{ fontSize:"11px",color:"var(--text-secondary)" }}>Anexar comprovante de transferência</div>
          <div style={{ fontSize:"10px",color:"var(--text-muted)",marginTop:"2px" }}>PDF, JPG, PNG · Máx 10MB</div>
        </div>
      </div>
    </div>
  )
}

const recentItems = [
  { tipo:"receita", desc:"J. Silva — parcela contrato", valor:32000, data:"08/05", status:"Recebido", c:"var(--success)" },
  { tipo:"despesa", desc:"Materiais — Aço Nordeste",    valor:12400, data:"08/05", status:"Pago",     c:"var(--danger)" },
  { tipo:"receita", desc:"Grupo Horizonte — consultoria",valor:42000,data:"07/05", status:"A Receber",c:"var(--warning)" },
  { tipo:"despesa", desc:"Aluguel escritório SP",        valor:8400, data:"07/05", status:"Vencido",  c:"var(--danger)" },
  { tipo:"transferencia",desc:"TED → Nubank PJ",         valor:10000,data:"06/05", status:"Realizado",c:"var(--accent)" },
]

export default function TransactionsPage() {
  const router = useRouter()
  const [tipo, setTipo] = useState<"receita"|"despesa"|"transferencia">("receita")

  const tipoConfig = {
    receita:       { label:"Receita",       color:"var(--success)", form:<ReceitaForm/> },
    despesa:       { label:"Despesa",       color:"var(--danger)",  form:<DespesaForm/> },
    transferencia: { label:"Transferência", color:"var(--accent)",  form:<TransferenciaForm/> },
  }

  return (
    <div style={{ padding:"22px" }}>
      {/* Header */}
      <div style={{ display:"flex",alignItems:"center",gap:"12px",marginBottom:"18px" }}>
        <button onClick={()=>router.back()} style={{ width:"32px",height:"32px",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)",background:"var(--bg-secondary)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--text-secondary)" }}>
          <ChevronLeft size={16}/>
        </button>
        <div>
          <h1 style={{ fontSize:"20px",fontWeight:800,color:"var(--text-primary)",letterSpacing:"-0.4px" }}>Novo Lançamento</h1>
          <p style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"2px" }}>Registro financeiro com rastreabilidade completa</p>
        </div>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"1fr 320px",gap:"20px" }}>
        {/* Form */}
        <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"22px" }}>
          {/* Tipo selector */}
          <div style={{ display:"flex",gap:"6px",marginBottom:"20px" }}>
            {(["receita","despesa","transferencia"] as const).map(t=>{
              const c = tipoConfig[t]
              return (
                <button key={t} onClick={()=>setTipo(t)} style={{
                  flex:1, padding:"11px 8px",
                  borderRadius:"var(--radius-sm)",
                  border:`1px solid ${tipo===t?c.color:"var(--border)"}`,
                  background: tipo===t ? `${c.color}18` : "transparent",
                  color: tipo===t ? c.color : "var(--text-secondary)",
                  fontSize:"13px", fontWeight:700, cursor:"pointer", fontFamily:"inherit",
                }}>{c.label}</button>
              )
            })}
          </div>

          {tipoConfig[tipo].form}

          {/* Actions */}
          <div style={{ display:"flex",gap:"8px",paddingTop:"16px",borderTop:"1px solid var(--border)",marginTop:"4px" }}>
            <button style={{ flex:1,padding:"11px",background:`${tipoConfig[tipo].color}`,border:"none",borderRadius:"var(--radius-sm)",fontSize:"13px",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
              Salvar {tipoConfig[tipo].label}
            </button>
            <button style={{ padding:"11px 16px",background:"var(--bg-tertiary)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",fontSize:"13px",color:"var(--text-secondary)",cursor:"pointer",fontFamily:"inherit" }}>
              Salvar e novo
            </button>
            <button onClick={()=>router.back()} style={{ padding:"11px 16px",background:"transparent",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",fontSize:"13px",color:"var(--text-muted)",cursor:"pointer",fontFamily:"inherit" }}>
              Cancelar
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div>
          <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"16px",marginBottom:"12px" }}>
            <div style={{ fontSize:"12px",fontWeight:700,color:"var(--text-primary)",marginBottom:"12px" }}>Últimos lançamentos</div>
            {recentItems.map((r,i)=>(
              <div key={i} style={{ display:"flex",alignItems:"center",gap:"9px",padding:"8px 0",borderBottom:i<recentItems.length-1?"1px solid var(--border)":"none" }}>
                <div style={{ width:"7px",height:"7px",borderRadius:"50%",background:r.c,flexShrink:0 }}/>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:"11.5px",fontWeight:500,color:"var(--text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{r.desc}</div>
                  <div style={{ fontSize:"10px",color:"var(--text-muted)",marginTop:"1px" }}>{r.data}</div>
                </div>
                <div style={{ textAlign:"right",flexShrink:0 }}>
                  <div style={{ fontSize:"11.5px",fontWeight:700,color:r.c }}>{r.tipo==="receita"?"+":"–"} {(r.valor/1000).toFixed(0)}k</div>
                  <div style={{ fontSize:"10px",color:r.status==="Vencido"?"var(--danger)":r.status==="Recebido"||r.status==="Pago"?"var(--success)":"var(--text-muted)" }}>{r.status}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"16px" }}>
            <div style={{ fontSize:"11px",fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"10px" }}>Boas práticas</div>
            {[
              tipo==="receita" ? "Sempre emita NF para receitas — facilita crédito e auditoria" : tipo==="despesa" ? "Exija NF de fornecedores: dedução fiscal e rastreabilidade" : "Transferências não aparecem no DRE — não são receita nem despesa",
              tipo==="receita" ? "Preencha o centro de custo para saber qual obra é mais lucrativa" : tipo==="despesa" ? "Rateie despesas administrativas entre obras no centro de custo" : "Use a descrição para identificar o propósito da transferência",
              tipo==="receita" ? "Registre na data de competência (quando o serviço foi prestado)" : tipo==="despesa" ? "Registre na data de competência, não só na data de pagamento" : "Guarde o comprovante para conciliação bancária",
            ].map((d,i)=>(
              <div key={i} style={{ display:"flex",gap:"7px",marginBottom:"7px",alignItems:"flex-start" }}>
                <div style={{ width:"4px",height:"4px",borderRadius:"50%",background:tipoConfig[tipo].color,marginTop:"6px",flexShrink:0 }}/>
                <span style={{ fontSize:"11px",color:"var(--text-secondary)",lineHeight:1.5 }}>{d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
