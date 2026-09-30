"use client"

import { useState } from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
]

function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

interface CalendarProps {
  /** Dia selecionado (YYYY-MM-DD). */
  selected?: string
  onSelect: (date: string) => void
  /** Primeiro e último dia selecionáveis (YYYY-MM-DD, no fuso da barbearia). */
  minDate: string
  maxDate: string
  /** Dias da semana (0–6) em que há atendimento; os demais ficam desabilitados. */
  enabledWeekdays?: number[]
}

/** Calendário mensal em pt-BR, trabalhando com datas locais (YYYY-MM-DD) para não sofrer com fuso. */
export function Calendar({ selected, onSelect, minDate, maxDate, enabledWeekdays }: CalendarProps) {
  const [cursor, setCursor] = useState(() => {
    const [y, m] = (selected ?? minDate).split("-").map(Number)
    return { year: y, month: m - 1 }
  })

  const firstWeekday = new Date(Date.UTC(cursor.year, cursor.month, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(cursor.year, cursor.month + 1, 0)).getUTCDate()
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const monthKey = (y: number, m: number) => y * 12 + m
  const minKey = monthKey(Number(minDate.slice(0, 4)), Number(minDate.slice(5, 7)) - 1)
  const maxKey = monthKey(Number(maxDate.slice(0, 4)), Number(maxDate.slice(5, 7)) - 1)
  const currentKey = monthKey(cursor.year, cursor.month)

  function move(delta: number) {
    const next = currentKey + delta
    setCursor({ year: Math.floor(next / 12), month: next % 12 })
  }

  return (
    <div className="w-full select-none">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Mês anterior"
          disabled={currentKey <= minKey}
          onClick={() => move(-1)}
          className="flex size-8 cursor-pointer items-center justify-center rounded-md border transition hover:bg-secondary disabled:cursor-default disabled:opacity-30"
        >
          <ChevronLeftIcon className="size-4" />
        </button>
        <p className="text-sm font-semibold">
          {MONTHS[cursor.month]} {cursor.year}
        </p>
        <button
          type="button"
          aria-label="Próximo mês"
          disabled={currentKey >= maxKey}
          onClick={() => move(1)}
          className="flex size-8 cursor-pointer items-center justify-center rounded-md border transition hover:bg-secondary disabled:cursor-default disabled:opacity-30"
        >
          <ChevronRightIcon className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((label) => (
          <span key={label} className="pb-2 text-xs text-muted-foreground">
            {label}
          </span>
        ))}
        {cells.map((day, index) => {
          if (day === null) {
            return <span key={`empty-${index}`} />
          }
          const value = iso(cursor.year, cursor.month, day)
          const weekday = (firstWeekday + day - 1) % 7
          const disabled =
            value < minDate || value > maxDate || (enabledWeekdays !== undefined && !enabledWeekdays.includes(weekday))
          const isSelected = value === selected
          return (
            <button
              key={value}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(value)}
              aria-pressed={isSelected}
              aria-label={value}
              className={cn(
                "aspect-square cursor-pointer rounded-full text-sm transition",
                isSelected ? "bg-primary font-bold text-primary-foreground" : "hover:bg-secondary",
                value === minDate && !isSelected && "text-primary",
                disabled && "cursor-default text-muted-foreground/40 hover:bg-transparent",
              )}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}
