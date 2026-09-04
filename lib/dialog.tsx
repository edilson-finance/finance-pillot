"use client"

import { createContext, useContext, useState, useCallback } from "react"
import { useDialogA11y } from "@/lib/use-dialog-a11y"

// Substitui window.confirm/window.alert por diálogos estilizados e acessíveis
// (dark UI + role=dialog + Esc + foco). Uso:
//   const { confirm, alert } = useDialog()
//   if (!(await confirm("Excluir?", { danger: true, confirmText: "Excluir" }))) return
//   await alert("Deu erro", { title: "Erro" })

type DialogOpts = { title?: string; confirmText?: string; cancelText?: string; danger?: boolean }
type DialogState = {
  message: string
  opts: DialogOpts
  kind: "confirm" | "alert"
  resolve: (v: boolean) => void
}

const Ctx = createContext<{
  confirm: (message: string, opts?: DialogOpts) => Promise<boolean>
  alert: (message: string, opts?: DialogOpts) => Promise<void>
} | null>(null)

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null)

  const confirm = useCallback(
    (message: string, opts: DialogOpts = {}) =>
      new Promise<boolean>((resolve) => setState({ message, opts, kind: "confirm", resolve })),
    [],
  )
  const alert = useCallback(
    (message: string, opts: DialogOpts = {}) =>
      new Promise<void>((resolve) => setState({ message, opts, kind: "alert", resolve: () => resolve() })),
    [],
  )

  const close = (v: boolean) => {
    state?.resolve(v)
    setState(null)
  }

  return (
    <Ctx.Provider value={{ confirm, alert }}>
      {children}
      {state && <DialogModal state={state} onClose={close} />}
    </Ctx.Provider>
  )
}

function DialogModal({ state, onClose }: { state: DialogState; onClose: (v: boolean) => void }) {
  const ref = useDialogA11y<HTMLDivElement>(() => onClose(false))
  const { message, opts, kind } = state
  return (
    <div
      onClick={() => onClose(false)}
      style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={opts.title ?? (kind === "confirm" ? "Confirmação" : "Aviso")}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: "400px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "14px", padding: "24px", outline: "none", boxShadow: "var(--shadow-lg)" }}
      >
        {opts.title && (
          <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>{opts.title}</div>
        )}
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: "20px" }}>{message}</p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          {kind === "confirm" && (
            <button
              onClick={() => onClose(false)}
              style={{ padding: "9px 16px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px", color: "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit" }}
            >
              {opts.cancelText ?? "Cancelar"}
            </button>
          )}
          <button
            autoFocus
            onClick={() => onClose(true)}
            style={{ padding: "9px 16px", background: opts.danger ? "var(--danger)" : "var(--accent)", border: "none", borderRadius: "8px", fontSize: "13px", color: "#fff", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
          >
            {opts.confirmText ?? (kind === "confirm" ? "Confirmar" : "OK")}
          </button>
        </div>
      </div>
    </div>
  )
}

export function useDialog() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useDialog deve ser usado dentro de <DialogProvider>")
  return ctx
}
