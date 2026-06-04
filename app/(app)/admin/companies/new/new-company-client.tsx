"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createCompany } from "../../actions"

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 11px", fontSize: "13px",
  border: "1px solid var(--border)", borderRadius: "8px",
  background: "var(--bg-primary)", color: "var(--text-primary)",
}
const labelStyle: React.CSSProperties = {
  fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px", display: "block",
}

export default function NewCompanyClient() {
  const router = useRouter()
  const [withAdmin, setWithAdmin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function onSubmit(formData: FormData) {
    setError(null)
    start(async () => {
      const res = await createCompany(formData)
      if (res.error) { setError(res.error); return }
      router.push("/admin")
    })
  }

  return (
    <div style={{ padding: "22px", maxWidth: "520px" }}>
      <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)" }}>Nova empresa</h1>
      <form action={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "18px" }}>
        <div>
          <label style={labelStyle}>Nome da empresa</label>
          <input name="name" required style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Tipo</label>
          <select name="type" defaultValue="construcao" style={inputStyle}>
            <option value="industria">Indústria</option>
            <option value="comercio">Comércio</option>
            <option value="servicos">Serviços</option>
            <option value="construcao">Construção</option>
            <option value="agro">Agro</option>
            <option value="tecnologia">Tecnologia</option>
            <option value="saude_educacao">Saúde / Educação</option>
            <option value="misto">Misto</option>
          </select>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "var(--text-primary)", cursor: "pointer" }}>
          <input type="checkbox" name="with_admin" checked={withAdmin} onChange={(e) => setWithAdmin(e.target.checked)} />
          Criar usuário administrador agora
        </label>

        {withAdmin && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "14px", border: "1px solid var(--border)", borderRadius: "8px" }}>
            <div>
              <label style={labelStyle}>Nome do admin</label>
              <input name="admin_name" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>E-mail do admin</label>
              <input name="admin_email" type="email" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Senha do admin</label>
              <input name="admin_password" type="text" style={inputStyle} />
            </div>
          </div>
        )}

        {error && <div style={{ color: "var(--danger)", fontSize: "12px" }}>{error}</div>}

        <div style={{ display: "flex", gap: "10px" }}>
          <button type="submit" disabled={pending} style={{
            background: "var(--accent)", color: "#fff", border: "none",
            padding: "9px 16px", borderRadius: "8px", fontSize: "12.5px", fontWeight: 600,
            cursor: pending ? "default" : "pointer", opacity: pending ? 0.6 : 1,
          }}>{pending ? "Criando..." : "Criar empresa"}</button>
          <button type="button" onClick={() => router.push("/admin")} style={{
            background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border)",
            padding: "9px 16px", borderRadius: "8px", fontSize: "12.5px", cursor: "pointer",
          }}>Cancelar</button>
        </div>
      </form>
    </div>
  )
}
