# ADR 0006 — Imagens em storage compatível com S3 (MinIO)

**Status:** aceita

## Contexto
Cada barbearia personaliza logo, capa, fotos dos barbeiros e dos serviços. Guardar arquivos no banco ou no
disco do container não escala e se perde a cada deploy. O projeto quer uma alternativa open source ao S3.

## Decisão
- Código fala a **API S3** (`@aws-sdk/client-s3`), então o provedor é troca de configuração:
  **MinIO** (padrão do docker-compose), SeaweedFS, Garage, Cloudflare R2 ou AWS S3.
- Chave do objeto: `tenants/<tenantId>/<tipo>/<uuid>.<ext>` — isolada por barbearia e imprevisível.
- Validação pelo conteúdo real (*magic bytes*): só JPG, PNG, WebP e AVIF, até 5 MB. SVG/GIF recusados
  (SVG pode carregar script).
- Bucket com leitura pública (as imagens aparecem nas páginas públicas); escrita só pela aplicação.
- Imagem substituída é apagada do storage (só se pertencer à mesma barbearia).
- Sem storage configurado, o painel continua aceitando URL de imagem.

## Consequências
- Imagens servidas direto pelo storage/CDN, fora do servidor Next.
- MinIO é AGPLv3: uso como serviço separado e sem modificação não obriga abrir o código da aplicação.
  A distribuição da edição comunitária do MinIO mudou em 2025 (imagens/binários): fixamos uma versão no
  compose; se for preciso trocar, SeaweedFS (Apache 2.0) ou Garage funcionam só mudando variáveis.
