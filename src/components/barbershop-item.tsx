import Link from "next/link"
import { HeartIcon, ScissorsIcon } from "lucide-react"
import { toggleFavoriteAction } from "@/app/actions/customer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface BarbershopCardData {
  id: string
  name: string
  address: string
  coverUrl: string
  url: string
  completedCount: number
  isFavorite: boolean
}

/** Card da vitrine (no estilo do projeto base) com favoritar e total de atendimentos. */
export function BarbershopItem({ shop, className }: { shop: BarbershopCardData; className?: string }) {
  return (
    <Card className={cn("min-w-[167px] overflow-hidden rounded-2xl p-1", className)}>
      <div className="relative h-[159px] w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={shop.coverUrl} alt={shop.name} className="size-full rounded-2xl object-cover" />
        <Badge variant="secondary" className="absolute top-2 left-2 bg-background/80 backdrop-blur">
          <ScissorsIcon className="text-primary" />
          {shop.completedCount}
        </Badge>
        <form action={toggleFavoriteAction.bind(null, shop.id)} className="absolute top-2 right-2">
          <button
            type="submit"
            aria-label={shop.isFavorite ? "Remover dos favoritos" : "Favoritar"}
            title={shop.isFavorite ? "Remover dos favoritos" : "Favoritar"}
            className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-background/80 backdrop-blur transition hover:scale-110"
          >
            <HeartIcon className={cn("size-4", shop.isFavorite ? "fill-rose-500 text-rose-500" : "text-foreground")} />
          </button>
        </form>
      </div>
      <div className="px-2 py-3">
        <h3 className="truncate font-semibold">{shop.name}</h3>
        <p className="truncate text-sm text-muted-foreground">{shop.address || " "}</p>
        <Button variant="secondary" className="mt-3 w-full" asChild>
          <Link href={shop.url}>Reservar</Link>
        </Button>
      </div>
    </Card>
  )
}
