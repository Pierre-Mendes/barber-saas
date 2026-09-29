import { NextResponse } from "next/server"
import { z } from "zod"
import { currentUser } from "@/auth"
import { db } from "@/lib/db"

const subscriptionSchema = z.object({
  endpoint: z.url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
})

export async function POST(request: Request) {
  const user = await currentUser()
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }
  const parsed = subscriptionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 422 })
  }
  const { endpoint, keys } = parsed.data
  await db.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent: request.headers.get("user-agent") },
    update: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth },
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const user = await currentUser()
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }
  const body = (await request.json().catch(() => null)) as { endpoint?: string } | null
  if (body?.endpoint) {
    await db.pushSubscription.deleteMany({ where: { endpoint: body.endpoint, userId: user.id } })
  }
  return NextResponse.json({ ok: true })
}
