import Link from "next/link"
import { CategoryIcon } from "@/components/category-icon"
import { Button } from "@/components/ui/button"
import { SERVICE_CATEGORIES } from "@/lib/catalog"
import { cn } from "@/lib/utils"

/** Atalhos por tipo de serviço (Cabelo, Barba, ...), como na home do projeto base. */
export function QuickSearch({ active }: { active?: string }) {
  return (
    <div className="scrollbar-none -mx-5 flex gap-3 overflow-x-auto px-5">
      {SERVICE_CATEGORIES.map((category) => (
        <Button
          key={category.slug}
          variant="secondary"
          className={cn("gap-2", active === category.slug && "bg-primary text-primary-foreground hover:bg-primary")}
          asChild
        >
          <Link href={`/explore?servico=${category.slug}`}>
            <CategoryIcon slug={category.slug} className={cn("size-4", active !== category.slug && "text-primary")} />
            {category.title}
          </Link>
        </Button>
      ))}
    </div>
  )
}
