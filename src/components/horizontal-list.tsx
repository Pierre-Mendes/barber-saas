import { cn } from "@/lib/utils"

/** Lista com rolagem horizontal no celular, usada nas seções da home. */
export function HorizontalList({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className="mt-6">
      <h2 className="section-title">{title}</h2>
      <div className={cn("scrollbar-none -mx-5 flex gap-4 overflow-x-auto px-5 pb-1", className)}>{children}</div>
    </section>
  )
}
