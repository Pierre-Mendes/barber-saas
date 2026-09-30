"use client"

import { useEffect, useState } from "react"
import { BellIcon, BellRingIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

type State = "unsupported" | "ios-install" | "idle" | "enabled" | "denied" | "working" | "error"

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"))
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i)
  }
  return bytes
}

/** Botão para ativar notificações no celular (Web Push). Não usa WhatsApp. */
export function PushOptIn({ vapidPublicKey }: { vapidPublicKey?: string }) {
  const [state, setState] = useState<State>("idle")

  useEffect(() => {
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !vapidPublicKey) {
      setState(isIos && !isStandalone ? "ios-install" : "unsupported")
      return
    }
    if (Notification.permission === "denied") {
      setState("denied")
      return
    }
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => subscription && setState("enabled"))
      .catch(() => undefined)
  }, [vapidPublicKey])

  async function enable() {
    if (!vapidPublicKey) {
      return
    }
    setState("working")
    try {
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        setState("denied")
        return
      }
      const registration = await navigator.serviceWorker.ready
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        }))
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      })
      setState(response.ok ? "enabled" : "error")
    } catch (error) {
      console.error(error)
      setState("error")
    }
  }

  if (state === "unsupported") {
    return null
  }
  if (state === "ios-install") {
    return (
      <p className="text-xs text-muted-foreground">
        No iPhone, toque em <b>Compartilhar → Adicionar à Tela de Início</b> e abra por lá para receber lembretes.
      </p>
    )
  }
  if (state === "enabled") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-success">
        <BellRingIcon className="size-4" /> Lembretes ativados neste aparelho
      </p>
    )
  }
  if (state === "denied") {
    return <p className="text-xs text-muted-foreground">Notificações bloqueadas. Libere nas configurações do site.</p>
  }
  return (
    <Button type="button" variant="outline" size="sm" onClick={enable} disabled={state === "working"}>
      <BellIcon /> {state === "error" ? "Tentar novamente" : "Receber lembretes no celular"}
    </Button>
  )
}
