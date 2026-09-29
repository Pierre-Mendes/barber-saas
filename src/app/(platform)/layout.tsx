import { PlatformHeader } from "@/components/platform-header"

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PlatformHeader />
      <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
    </>
  )
}
