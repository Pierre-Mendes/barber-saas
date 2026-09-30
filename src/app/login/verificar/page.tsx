import { MailIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export default function VerifyRequestPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary">
            <MailIcon className="size-6" />
          </div>
          <h1 className="text-2xl font-bold">Confira seu e-mail</h1>
          <p className="text-sm text-muted-foreground">Enviamos um link de acesso. Ele vale por 24 horas.</p>
        </CardContent>
      </Card>
    </main>
  )
}
