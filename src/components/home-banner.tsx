import { CalendarCheckIcon, ScissorsIcon } from "lucide-react"
import { PLATFORM_NAME } from "@/lib/catalog"

/** Banner da home (arte própria no lugar da imagem do projeto base). */
export function HomeBanner({ title, subtitle }: { title?: string; subtitle?: string }) {
  return (
    <div className="relative h-[150px] w-full overflow-hidden rounded-xl bg-gradient-to-br from-primary via-primary/75 to-[#1b1340] md:h-[180px]">
      <div className="absolute top-1/2 -right-6 size-[190px] -translate-y-1/2 rounded-full border-2 border-white/20 md:right-10 md:size-[240px]" />
      <div className="absolute top-1/2 right-4 size-[130px] -translate-y-1/2 rounded-full bg-black/15 md:right-20 md:size-[170px]" />
      <ScissorsIcon className="absolute top-1/2 right-10 size-16 -translate-y-1/2 -rotate-45 text-white/70 md:right-32 md:size-24" strokeWidth={1.5} />
      <div className="relative flex h-full max-w-[62%] flex-col justify-center gap-1.5 p-5 md:p-8">
        <p className="text-xl leading-tight font-extrabold md:text-3xl">
          {title ?? (
            <>
              Agende nos melhores com <span className="whitespace-nowrap">{PLATFORM_NAME}</span>
            </>
          )}
        </p>
        <p className="flex items-center gap-1.5 text-xs text-white/80 md:text-sm">
          <CalendarCheckIcon className="size-4 shrink-0" />
          {subtitle ?? "Lembrete no celular e direto na sua agenda"}
        </p>
      </div>
    </div>
  )
}
