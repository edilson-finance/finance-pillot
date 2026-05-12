"use client"

import { createContext, useContext, useState, ReactNode } from "react"

export type DatePreset =
  | "today" | "yesterday" | "this_week" | "last_week"
  | "this_month" | "last_month" | "last_7" | "last_30"
  | "last_90" | "this_quarter" | "last_quarter"
  | "this_year" | "last_year" | "custom"

export interface DateRange {
  start: Date
  end: Date
  preset: DatePreset
  label: string
}

function getPresetRange(preset: DatePreset): DateRange {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const fmt = (d: Date) => {
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
  }

  switch (preset) {
    case "today": {
      return { start: today, end: today, preset, label: `${fmt(today)} → ${fmt(today)}` }
    }
    case "yesterday": {
      const d = new Date(today); d.setDate(d.getDate() - 1)
      return { start: d, end: d, preset, label: `${fmt(d)} → ${fmt(d)}` }
    }
    case "this_week": {
      const s = new Date(today); s.setDate(today.getDate() - today.getDay() + 1)
      const e = new Date(s); e.setDate(s.getDate() + 6)
      return { start: s, end: e, preset, label: `${fmt(s)} → ${fmt(e)}` }
    }
    case "last_week": {
      const s = new Date(today); s.setDate(today.getDate() - today.getDay() - 6)
      const e = new Date(s); e.setDate(s.getDate() + 6)
      return { start: s, end: e, preset, label: `${fmt(s)} → ${fmt(e)}` }
    }
    case "this_month": {
      const s = new Date(today.getFullYear(), today.getMonth(), 1)
      const e = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return { start: s, end: e, preset, label: `${fmt(s)} → ${fmt(e)}` }
    }
    case "last_month": {
      const s = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const e = new Date(today.getFullYear(), today.getMonth(), 0)
      return { start: s, end: e, preset, label: `${fmt(s)} → ${fmt(e)}` }
    }
    case "last_7": {
      const s = new Date(today); s.setDate(today.getDate() - 6)
      return { start: s, end: today, preset, label: `${fmt(s)} → ${fmt(today)}` }
    }
    case "last_30": {
      const s = new Date(today); s.setDate(today.getDate() - 29)
      return { start: s, end: today, preset, label: `${fmt(s)} → ${fmt(today)}` }
    }
    case "last_90": {
      const s = new Date(today); s.setDate(today.getDate() - 89)
      return { start: s, end: today, preset, label: `${fmt(s)} → ${fmt(today)}` }
    }
    case "this_quarter": {
      const q = Math.floor(today.getMonth() / 3)
      const s = new Date(today.getFullYear(), q * 3, 1)
      const e = new Date(today.getFullYear(), q * 3 + 3, 0)
      return { start: s, end: e, preset, label: `${fmt(s)} → ${fmt(e)}` }
    }
    case "last_quarter": {
      const q = Math.floor(today.getMonth() / 3)
      const s = new Date(today.getFullYear(), (q - 1) * 3, 1)
      const e = new Date(today.getFullYear(), q * 3, 0)
      return { start: s, end: e, preset, label: `${fmt(s)} → ${fmt(e)}` }
    }
    case "this_year": {
      const s = new Date(today.getFullYear(), 0, 1)
      const e = new Date(today.getFullYear(), 11, 31)
      return { start: s, end: e, preset, label: `${fmt(s)} → ${fmt(e)}` }
    }
    case "last_year": {
      const s = new Date(today.getFullYear() - 1, 0, 1)
      const e = new Date(today.getFullYear() - 1, 11, 31)
      return { start: s, end: e, preset, label: `${fmt(s)} → ${fmt(e)}` }
    }
    default:
      return getPresetRange("this_month")
  }
}

interface DateRangeCtx {
  range: DateRange
  setRange: (r: DateRange) => void
  setPreset: (p: DatePreset) => void
  getPresetRange: (p: DatePreset) => DateRange
}

const Ctx = createContext<DateRangeCtx | null>(null)

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [range, setRange] = useState<DateRange>(() => getPresetRange("this_month"))

  function setPreset(p: DatePreset) {
    setRange(getPresetRange(p))
  }

  return (
    <Ctx.Provider value={{ range, setRange, setPreset, getPresetRange }}>
      {children}
    </Ctx.Provider>
  )
}

export function useDateRange() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useDateRange must be inside DateRangeProvider")
  return ctx
}
