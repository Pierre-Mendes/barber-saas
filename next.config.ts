import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      // Upload de imagens (limite da aplicação: 5 MB, validado em src/lib/storage/images.ts).
      bodySizeLimit: "6mb",
    },
  },
}

export default nextConfig
