import { Footer, PlatformHeader } from "@/components/platform-header"

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <PlatformHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-6">{children}</main>
      <Footer />
    </div>
  )
}
