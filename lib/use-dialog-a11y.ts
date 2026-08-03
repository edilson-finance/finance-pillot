"use client"
import { useEffect, useRef } from "react"

// Acessibilidade de modal (WCAG 2.1.2 / 4.1.2): fecha no Esc e move o foco para o
// diálogo ao abrir. Retorna uma ref para pôr no container do modal (que deve ter
// role="dialog" aria-modal="true" e tabIndex={-1}). Foco-trap completo (ciclar
// Tab dentro) fica como melhoria futura; isto já cobre Esc + foco inicial.
export function useDialogA11y<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T>(null)
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    ref.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
      // devolve o foco ao elemento que abriu o modal
      prev?.focus?.()
    }
  }, [onClose])
  return ref
}
