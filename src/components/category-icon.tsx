import { BrushIcon, DropletsIcon, EyeIcon, HandIcon, ScissorsIcon, type LucideProps } from "lucide-react"
import type { CategorySlug } from "@/lib/catalog"

function RazorIcon(props: LucideProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 14 11 6h3l-8 8z" />
      <path d="m14 6 7-3" />
      <path d="M6 14v4" />
    </svg>
  )
}

const ICONS: Record<CategorySlug, (props: LucideProps) => React.ReactNode> = {
  cabelo: ScissorsIcon,
  barba: RazorIcon,
  acabamento: BrushIcon,
  massagem: HandIcon,
  sobrancelha: EyeIcon,
  hidratacao: DropletsIcon,
}

export function CategoryIcon({ slug, ...props }: LucideProps & { slug: CategorySlug }) {
  const Icon = ICONS[slug]
  return <Icon {...props} />
}
