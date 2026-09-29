import webpush from "web-push"
import { db } from "@/lib/db"
import { env } from "@/lib/env"
import type { PushContent } from "./templates"

let configured = false

function configure(): boolean {
  if (!env.vapidPublicKey || !env.vapidPrivateKey) {
    return false
  }
  if (!configured) {
    webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey)
    configured = true
  }
  return true
}

/**
 * Envia Web Push para todos os dispositivos do usuário (Android, desktop e
 * iPhone com o app instalado na tela inicial). Assinaturas expiradas são removidas.
 */
export async function sendPushToUser(userId: string, content: PushContent): Promise<void> {
  if (!configure()) {
    return
  }
  const subscriptions = await db.pushSubscription.findMany({ where: { userId } })
  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
          JSON.stringify(content),
          { TTL: 60 * 60 * 24 },
        )
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) {
          await db.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => undefined)
        } else {
          console.error("[push] falha ao enviar", statusCode, error)
        }
      }
    }),
  )
}
