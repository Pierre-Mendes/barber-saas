# Arquitetura

Aplicação única em **Next.js 15 (App Router) rodando em Node.js**, com PostgreSQL via Prisma. Não há API REST
separada: páginas são React Server Components e as mutações são **Server Actions**.

## Camadas

```
src/app/            → rotas (páginas, layouts, server actions, rotas de API)
src/components/     → componentes React (ui/ = primitivos; admin/ = painel)
src/lib/            → regras de negócio e infraestrutura, sem React
prisma/             → schema, migrações e seed
```

Regra de dependência: `app → components → lib`. Nada em `src/lib` importa de `src/app` ou `src/components`
(exceção: tipos de dados para UI, como `BarbershopCardData`).

## Módulos de `src/lib`

| Módulo | Responsabilidade | Pontos de entrada |
|---|---|---|
| `tenancy/` | Descobrir a barbearia pelo host e montar URLs públicas | `resolveHost`, `getTenantByRouteKey`, `tenantPublicUrlFor` |
| `auth/` | Permissões por papel, guardas de acesso, senha e destino pós-login | `can`, `requirePanel`, `requireUser`, `hashPassword`, `landingPath` |
| `scheduling/` | Horários livres e fuso horário (funções puras) | `computeAvailableSlots`, `zonedToUtc`, `toLocalDate` |
| `booking/` | Criar, cancelar e concluir agendamentos; regra de cancelamento | `getAvailableSlots`, `createBooking`, `cancelBooking`, `canCustomerCancel`, `toBookingCard` |
| `notifications/` | E-mail, Web Push e lembretes | `notifyBookingConfirmed`, `notifyBookingCancelled`, `sendDueReminders` |
| `calendar/` | `.ics` e links do Google/Outlook | `buildIcs`, `googleCalendarUrl` |
| `marketplace/` | Vitrine do cliente e ranking | `getMarketplaceShops`, `rankBarbershops` |
| `cache/` | Cache Redis com invalidação por versão e rate limit (fail-open) | `cached`, `invalidateSchedule`, `invalidateTenant`, `rateLimit` |
| `storage/` | Imagens em storage S3 (MinIO) com validação por magic bytes | `storeTenantImage`, `removeTenantImage`, `validateImage` |
| `catalog.ts` | Categorias de serviço, arte padrão, nome da plataforma | `SERVICE_CATEGORIES`, `serviceFallbackImage` |

## Fluxo de uma requisição

1. `src/middleware.ts` lê o host:
   - **plataforma** (`ROOT_DOMAIN`): segue normal (`/`, `/explore`, `/bookings`, `/admin`, `/onboarding`);
   - **subdomínio ou domínio próprio:** reescreve para `/t/<slug>` ou `/t/~<dominio>` e marca o header interno
     `x-tenant-rewrite`.
2. A página resolve a barbearia (`getTenantByRouteKey`) ou o painel (`requirePanel`).
3. Mutação → Server Action → validação `zod` → guarda de acesso → serviço de `src/lib` → `revalidatePath`.
4. Efeitos colaterais (e-mail, push) rodam com `after()` para não atrasar a resposta.

## Rotas

| Rota | Quem usa |
|---|---|
| `/` | Landing (anônimo) ou home do cliente (logado) |
| `/explore` | Vitrine/busca (só logado) |
| `/bookings` | Agendamentos do cliente em todas as barbearias |
| `/onboarding` | Cadastro de nova barbearia |
| `/admin`, `/admin/[slug]/…` | Painel da barbearia |
| `/t/[tenant]`, `/t/[tenant]/reserva/[id]`, `/t/[tenant]/agendamentos` | Página white-label |
| `/login`, `/login/verificar` | Login neutro (sem marca da plataforma): senha, link por e-mail, Google, acesso rápido (dev) |
| `/conta` | Nome, celular, foto e senha do usuário |
| `/api/auth/*`, `/api/bookings/[id]/ics`, `/api/push/subscribe`, `/api/cron/reminders`, `/api/health` | API |

## Infraestrutura

- `docker-compose.yml`: `app`, `db` (Postgres 16), `redis` (cache/rate limit), `minio` + `minio-init` (imagens),
  `mailpit` (e-mail de dev), `cron` (lembretes), `seed`.
- `Dockerfile`: build *standalone*; aplica migrações ao iniciar.
- CI (`.github/workflows/ci.yml`): lint → typecheck → testes (com Postgres) → build.
