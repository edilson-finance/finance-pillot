"use client"

import { createContext, useContext, useEffect, useState } from "react"

interface MobileNavCtx {
  open: boolean
  setOpen: (v: boolean) => void
  isMobile: boolean
}

const Ctx = createContext<MobileNavCtx>({ open: false, setOpen: () => {}, isMobile: false })

// Abaixo deste limite a sidebar vira gaveta (drawer) sobreposta.
const MOBILE_QUERY = "(max-width: 900px)"

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY)
    const apply = () => {
      setIsMobile(mq.matches)
      if (!mq.matches) setOpen(false) // ao voltar pro desktop, garante gaveta fechada
    }
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [])

  return <Ctx.Provider value={{ open, setOpen, isMobile }}>{children}</Ctx.Provider>
}

export const useMobileNav = () => useContext(Ctx)
