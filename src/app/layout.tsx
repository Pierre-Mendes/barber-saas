import type { Metadata, Viewport } from "next"
import { ServiceWorkerRegistration } from "@/components/service-worker-registration"
import "./globals.css"

export const metadata: Metadata = {
  title: "Agenda",
  description: "Agende seu horário",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Agenda", statusBarStyle: "black-translucent" },
}

export const viewport: Viewport = {
  themeColor: "#141518",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  )
}
