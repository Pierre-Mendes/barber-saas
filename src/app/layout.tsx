import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { ServiceWorkerRegistration } from "@/components/service-worker-registration"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

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
    // Extensões do navegador (tradutor, gerenciador de senhas…) adicionam atributos em <html>/<body>
    // antes do React hidratar; isso não é erro do app.
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen font-sans" suppressHydrationWarning>
        {children}
        <Toaster />
        <ServiceWorkerRegistration />
      </body>
    </html>
  )
}
