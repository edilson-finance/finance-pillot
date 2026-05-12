"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { useDateRange, DatePreset, DateRange } from "@/lib/date-context"

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: "today",        label: "Hoje" },
  { key: "yesterday",    label: "Ontem" },
  { key: "this_week",    label: "Esta semana" },
  { key: "last_week",    label: "Semana passada" },
  { key: "this_month",   label: "Este mês" },
  { key: "last_month",   label: "Mês passado" },
  { key: "last_7",       label: "Últimos 7 dias" },
  { key: "last_30",      label: "Últimos 30 dias" },
  { key: "last_90",      label: "Últimos 90 dias" },
  { key: "this_quarter", label: "Este trimestre" },
  { key: "last_quarter", label: "Trimestre passado" },
  { key: "this_year",    label: "Este ano" },
  { key: "last_year",    label: "Ano passado" },
  { key: "custom",       label: "Personalizado" },
]

const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]
const DAYS_PT   = ["D","S","T","Q","Q","S","S"]

function isSameDay(a: Date, b: Date) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate()
}
function isInRange(d: Date, s: Date, e: Date) {
  return d >= s && d <= e
}

interface CalMonthProps {
  year: number
  month: number
  start: Date | null
  end: Date | null
  hover: Date | null
  onDayClick: (d: Date) => void
  onDayHover: (d: Date) => void
  onPrev?: () => void
  onNext?: () => void
  showNav?: boolean
}

function CalMonth({ year, month, start, end, hover, onDayClick, onDayHover, onPrev, onNext, showNav }: CalMonthProps) {
  const firstDay = new Date(year, month, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))

  // effective end for range highlight
  const effEnd = end ?? hover

  return (
    <div style={{ width: "224px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        {onPrev ? (
          <button onClick={onPrev} style={{ width:"28px",height:"28px",border:"1px solid var(--border)",background:"var(--bg-tertiary)",borderRadius:"6px",cursor:"pointer",color:"var(--text-secondary)",display:"flex",alignItems:"center",justifyContent:"center" }}>
            <ChevronLeft size={14}/>
          </button>
        ) : <div style={{width:"28px"}} />}
        <span style={{ fontSize:"13px",fontWeight:600,color:"var(--text-primary)" }}>
          {MONTHS_PT[month]} {year}
        </span>
        {onNext ? (
          <button onClick={onNext} style={{ width:"28px",height:"28px",border:"1px solid var(--border)",background:"var(--bg-tertiary)",borderRadius:"6px",cursor:"pointer",color:"var(--text-secondary)",display:"flex",alignItems:"center",justifyContent:"center" }}>
            <ChevronRight size={14}/>
          </button>
        ) : <div style={{width:"28px"}} />}
      </div>

      {/* Day names */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:"4px" }}>
        {DAYS_PT.map((d,i) => (
          <div key={i} style={{ textAlign:"center",fontSize:"10px",fontWeight:600,color:"var(--text-muted)",padding:"2px 0" }}>{d}</div>
        ))}
      </div>

      {/* Days */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"1px" }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} />
          const isStart  = start && isSameDay(day, start)
          const isEnd    = effEnd && isSameDay(day, effEnd)
          const inRange  = start && effEnd && isInRange(day, start, effEnd)
          const isToday  = isSameDay(day, new Date())

          return (
            <button
              key={idx}
              onClick={() => onDayClick(day)}
              onMouseEnter={() => onDayHover(day)}
              style={{
                height: "30px",
                border: "none",
                borderRadius: isStart ? "6px 0 0 6px" : isEnd ? "0 6px 6px 0" : "0",
                background: (isStart || isEnd) ? "var(--accent)" : inRange ? "var(--accent-soft)" : "transparent",
                color: (isStart || isEnd) ? "#fff" : isToday ? "var(--accent)" : "var(--text-primary)",
                fontSize: "12px",
                fontWeight: (isStart || isEnd || isToday) ? 700 : 400,
                cursor: "pointer",
                position: "relative",
                outline: isToday && !(isStart || isEnd) ? "1px solid var(--accent)" : "none",
                outlineOffset: "-1px",
              }}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function DateRangePicker() {
  const { range, setRange, setPreset, getPresetRange } = useDateRange()
  const [open, setOpen] = useState(false)
  const [hoveredPreset, setHoveredPreset] = useState<DatePreset | null>(null)

  // Calendar state
  const today = new Date()
  const [leftYear,  setLeftYear]  = useState(today.getFullYear())
  const [leftMonth, setLeftMonth] = useState(today.getMonth() === 0 ? 11 : today.getMonth() - 1)
  const [leftYearAdj, setLeftYearAdj] = useState(today.getMonth() === 0 ? today.getFullYear()-1 : today.getFullYear())

  const [selStart, setSelStart] = useState<Date | null>(range.start)
  const [selEnd,   setSelEnd]   = useState<Date | null>(range.end)
  const [hover,    setHover]    = useState<Date | null>(null)
  const [phase,    setPhase]    = useState<"start" | "end">("start")

  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [open])

  // Right month = left + 1
  let rightMonth = (leftMonth === 11 ? 0 : leftMonth + 1)
  const rightYear = leftMonth === 11 ? leftYearAdj + 1 : leftYearAdj

  function prevMonth() {
    if (leftMonth === 0) { setLeftMonth(11); setLeftYearAdj(y => y - 1) }
    else setLeftMonth(m => m - 1)
  }
  function nextMonth() {
    if (leftMonth === 11) { setLeftMonth(0); setLeftYearAdj(y => y + 1) }
    else setLeftMonth(m => m + 1)
  }

  function handleDayClick(d: Date) {
    if (phase === "start") {
      setSelStart(d); setSelEnd(null); setPhase("end")
    } else {
      if (selStart && d < selStart) {
        setSelStart(d); setSelEnd(null); setPhase("end")
      } else {
        setSelEnd(d); setPhase("start")
      }
    }
  }

  function applyCustom() {
    if (!selStart) return
    const end = selEnd ?? selStart
    const fmt = (dt: Date) => dt.toLocaleDateString("pt-BR", { day:"2-digit",month:"short",year:"numeric" })
    const newRange: DateRange = {
      start: selStart, end, preset: "custom",
      label: `${fmt(selStart)} → ${fmt(end)}`,
    }
    setRange(newRange)
    setOpen(false)
  }

  function applyPreset(p: DatePreset) {
    setPreset(p)
    setOpen(false)
  }

  // input helpers
  const fmtInput = (d: Date | null) => d ? d.toLocaleDateString("pt-BR") : ""

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "7px 13px",
          background: open ? "var(--bg-elevated)" : "var(--bg-tertiary)",
          border: `1px solid ${open ? "var(--accent)" : "var(--border)"}`,
          borderRadius: "var(--radius-sm)",
          fontSize: "13px", fontWeight: 500,
          color: "var(--text-primary)",
          cursor: "pointer",
          transition: "all 0.15s",
          whiteSpace: "nowrap",
        }}>
        <Calendar size={14} style={{ color: "var(--accent)", flexShrink:0 }} />
        <span>{range.label}</span>
        <ChevronDown size={13} style={{ color:"var(--text-muted)", transform: open?"rotate(180deg)":"none", transition:"transform 0.2s" }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0,
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          zIndex: 1000,
          display: "flex",
          overflow: "hidden",
          minWidth: "580px",
        }}>
          {/* Presets */}
          <div style={{
            width: "180px", flexShrink:0,
            borderRight: "1px solid var(--border)",
            padding: "8px",
            display: "flex", flexDirection:"column",gap:"1px",
          }}>
            {PRESETS.map(p => (
              <button
                key={p.key}
                onClick={() => p.key === "custom" ? null : applyPreset(p.key)}
                onMouseEnter={() => p.key !== "custom" && setHoveredPreset(p.key)}
                onMouseLeave={() => setHoveredPreset(null)}
                style={{
                  textAlign: "left", padding: "8px 12px",
                  border: "none", borderRadius: "7px",
                  background: range.preset === p.key ? "var(--accent-soft)" : hoveredPreset === p.key ? "var(--bg-tertiary)" : "transparent",
                  color: range.preset === p.key ? "var(--accent)" : "var(--text-secondary)",
                  fontSize: "12px", fontWeight: range.preset === p.key ? 600 : 400,
                  cursor: "pointer",
                }}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Calendars */}
          <div style={{ padding: "16px 20px", flex:1 }}>
            <div style={{ display:"flex", gap:"24px", marginBottom:"16px" }}>
              <CalMonth
                year={leftYearAdj} month={leftMonth}
                start={selStart} end={selEnd} hover={hover}
                onDayClick={handleDayClick}
                onDayHover={d => phase==="end" && setHover(d)}
                onPrev={prevMonth}
                showNav
              />
              <CalMonth
                year={rightYear} month={rightMonth}
                start={selStart} end={selEnd} hover={hover}
                onDayClick={handleDayClick}
                onDayHover={d => phase==="end" && setHover(d)}
                onNext={nextMonth}
                showNav
              />
            </div>

            {/* Manual inputs */}
            <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"14px" }}>
              <input
                type="text"
                placeholder="DD/MM/AAAA"
                value={fmtInput(selStart)}
                onChange={e => {
                  const parts = e.target.value.split("/")
                  if (parts.length === 3) {
                    const d = new Date(+parts[2], +parts[1]-1, +parts[0])
                    if (!isNaN(d.getTime())) setSelStart(d)
                  }
                }}
                style={{ flex:1, padding:"7px 10px", background:"var(--bg-tertiary)", border:"1px solid var(--border)", borderRadius:"6px", fontSize:"12px", color:"var(--text-primary)", outline:"none" }}
              />
              <span style={{ color:"var(--text-muted)", fontSize:"12px" }}>→</span>
              <input
                type="text"
                placeholder="DD/MM/AAAA"
                value={fmtInput(selEnd)}
                onChange={e => {
                  const parts = e.target.value.split("/")
                  if (parts.length === 3) {
                    const d = new Date(+parts[2], +parts[1]-1, +parts[0])
                    if (!isNaN(d.getTime())) setSelEnd(d)
                  }
                }}
                style={{ flex:1, padding:"7px 10px", background:"var(--bg-tertiary)", border:"1px solid var(--border)", borderRadius:"6px", fontSize:"12px", color:"var(--text-primary)", outline:"none" }}
              />
            </div>

            <div style={{ display:"flex", gap:"8px", justifyContent:"flex-end" }}>
              <button onClick={() => setOpen(false)} style={{ padding:"7px 16px", background:"var(--bg-tertiary)", border:"1px solid var(--border)", borderRadius:"7px", fontSize:"12px", color:"var(--text-secondary)", cursor:"pointer" }}>
                Cancelar
              </button>
              <button onClick={applyCustom} disabled={!selStart} style={{ padding:"7px 16px", background:"var(--accent)", border:"none", borderRadius:"7px", fontSize:"12px", color:"#fff", fontWeight:600, cursor:selStart?"pointer":"not-allowed", opacity:selStart?1:0.5 }}>
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
