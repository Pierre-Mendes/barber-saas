import { NextResponse } from "next/server"
import { env } from "@/lib/env"
import { sendDueReminders } from "@/lib/notifications"

export const dynamic = "force-dynamic"

/** Chamado periodicamente (serviço `cron` do docker-compose ou Vercel Cron). */
export async function GET(request: Request) {
  const secret = env.cronSecret
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }
  const sent = await sendDueReminders()
  return NextResponse.json({ sent })
}
