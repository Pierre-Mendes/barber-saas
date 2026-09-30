import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

export function formatCurrency(value: number | string | { toString(): string }): string {
  return brl.format(Number(value))
}

export function initials(name: string | null | undefined): string {
  if (!name) {
    return "?"
  }
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")).toUpperCase()
}
