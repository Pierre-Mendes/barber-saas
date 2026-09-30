# Cache (Redis) e imagens (S3/MinIO)

## Cache — `src/lib/cache/`

| O quê | Chave | TTL | Invalidação |
|---|---|---|---|
| Barbearia por slug/domínio | `tenant:<chave>` | 5 min | `invalidateTenant(...)` ao salvar personalização e ao criar barbearia |
| Horários livres | `slots:<tenant>:<versão>:…` | 60 s | `invalidateSchedule(tenantId)` |
| Vitrine do cliente | `mkt:<versão>:<versão do usuário>:…` | 2 min | `bumpVersion(VERSION.marketplace)` / `VERSION.userMarketplace(id)` |

### Regras
- Use `cached(key, ttl, loader)`; nunca leia/escreva no Redis direto em código de feature.
- **Mudou algo que afeta horários?** (agendamento, expediente, folga, barbeiro, serviço, regras da agenda)
  → `await invalidateSchedule(tenantId)`. Em `src/lib/booking/service.ts` isso já é feito para criar e cancelar.
- **Mudou dado da barbearia** (nome, slug, domínio, cor, imagens) → `invalidateTenant(antigo, novo)`.
- Gravação nunca confia no cache: `getAvailableSlots({ …, fresh: true })` antes de gravar.
- Valores em JSON: `Date` volta como `Date`; **`Decimal` do Prisma vira string** — converta antes de cachear.
- Cache é *fail-open*: o código deve funcionar igual sem Redis.
- Chaves de dados de barbearia sempre incluem o `tenantId` (ou o slug), nunca só um id de outro modelo.

### Rate limit — `rateLimit(nome, identificador, regra)`
Regras em `RATE_LIMITS` (`src/lib/cache/rate-limit.ts`). Hoje: link mágico (e-mail, IP e no provider) e
reservas. Novas ações sensíveis (convites, formulários públicos) devem usar o mesmo helper.

## Imagens — `src/lib/storage/`
- Upload só por `storeTenantImage(tenantId, tipo, file)`: valida formato real e tamanho, grava em
  `tenants/<tenantId>/<tipo>/<uuid>.<ext>` e devolve a URL pública.
- Nas actions do painel, use o helper `uploadedOr(...)` (arquivo enviado → URL; senão a URL digitada).
- Ao trocar uma imagem, apague a antiga com `removeTenantImage(tenantId, urlAntiga)` (só remove se for da
  mesma barbearia).
- No formulário: `<ImageField fileName=… urlName=… uploadEnabled={isStorageConfigured()} />`.
- Renderize com `<img>` (não `next/image`): URLs vêm de storages/CDNs arbitrários.
- Nunca aceite SVG/GIF nem confie em extensão/Content-Type do navegador.

## Testes
```bash
TEST_REDIS_URL=redis://localhost:6379/15 npx vitest run tests/cache.test.ts
TEST_S3_ENDPOINT=http://localhost:9000 npx vitest run tests/storage.test.ts   # MinIO do compose
```
