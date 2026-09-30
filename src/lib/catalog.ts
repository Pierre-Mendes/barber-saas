/** Nome da plataforma (aparece só nas telas da plataforma, nunca na página da barbearia). */
export const PLATFORM_NAME = process.env.NEXT_PUBLIC_PLATFORM_NAME || "Agenda Barber"

export type CategorySlug = "cabelo" | "barba" | "acabamento" | "massagem" | "sobrancelha" | "hidratacao"

export interface ServiceCategory {
  slug: CategorySlug
  title: string
  /** Palavras que identificam um serviço dessa categoria pelo nome. */
  keywords: string[]
}

/** Busca rápida da home (como no projeto base): filtra barbearias pelos serviços oferecidos. */
export const SERVICE_CATEGORIES: ServiceCategory[] = [
  { slug: "cabelo", title: "Cabelo", keywords: ["cabelo", "corte"] },
  { slug: "barba", title: "Barba", keywords: ["barba"] },
  { slug: "acabamento", title: "Acabamento", keywords: ["acabamento", "pezinho", "degradê", "degrade"] },
  { slug: "massagem", title: "Massagem", keywords: ["massagem"] },
  { slug: "sobrancelha", title: "Sobrancelha", keywords: ["sobrancelha"] },
  { slug: "hidratacao", title: "Hidratação", keywords: ["hidrata"] },
]

export function findCategory(slug: string | undefined): ServiceCategory | undefined {
  return SERVICE_CATEGORIES.find((category) => category.slug === slug)
}

/** Ilustração padrão para serviços sem foto, escolhida pelo nome. */
export function serviceFallbackImage(serviceName: string): string {
  const name = serviceName.toLowerCase()
  const hasHair = /corte|cabelo/.test(name)
  const hasBeard = name.includes("barba")
  if (hasHair && hasBeard) {
    return "/demo/services/combo.svg"
  }
  for (const category of SERVICE_CATEGORIES) {
    if (category.keywords.some((keyword) => name.includes(keyword))) {
      return `/demo/services/${category.slug}.svg`
    }
  }
  return "/demo/services/cabelo.svg"
}

/** Capa padrão para barbearias sem banner, estável por id. */
export function tenantFallbackCover(tenantId: string): string {
  let hash = 0
  for (const char of tenantId) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }
  return `/demo/covers/cover-${(hash % 8) + 1}.svg`
}
