export function PageHeader({ title, description, children }: { title: React.ReactNode; description?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold first-letter:uppercase">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

export function StatCard({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
  )
}
