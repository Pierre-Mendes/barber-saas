# Multi-tenancy (regras invioláveis)

Uma falha aqui vaza dados de uma barbearia para outra. Estas regras valem para **todo** código novo.

## 1. Todo dado de barbearia é filtrado por `tenantId`
- Consultas de `Barber`, `Service`, `Customer`, `Booking`, `Membership` sempre com `tenantId` no `where`
  (ou por relação que já garanta, como `barber: { tenantId }`).
- Use `findFirst({ where: { id, tenantId } })`, **nunca** `findUnique({ where: { id } })` com um id vindo do
  cliente.
- Em updates/deletes a partir do painel, prefira `updateMany/deleteMany({ where: { id, tenantId } })`.

## 2. Todo acesso ao painel passa por `requirePanel(slug, permissão)`
- `src/lib/auth/guards.ts`. Ele confere o vínculo (`Membership`) do usuário com **aquela** barbearia e a
  permissão do papel. Sem vínculo, a resposta é 404 (não revela que a barbearia existe).
- Server Actions do painel chamam `requirePanel` **de novo**: a página ter checado não basta.
- Barbeiro só mexe na própria agenda: use `canManageBarberSchedule(ctx, barberId)` ou o `barberId` de
  `ctx.ownBarber`.

## 3. A página white-label não revela a plataforma nem outras barbearias
- `/t/[tenant]/*` usa só `TenantHeader`/`TenantMenu`/`TenantFooter`. Nada de `PlatformHeader`, links para
  `/explore` ou nome da plataforma (`PLATFORM_NAME`).
- "Meus agendamentos" dentro da barbearia filtra por `tenantId` (`/t/[tenant]/agendamentos`).
- As barbearias **não** veem a vitrine nem a lista de outras. `listedInMarketplace` é controlado pela plataforma.

## 4. O cliente é global; o `Customer` é por barbearia
- Dados que a barbearia vê do cliente vêm de `Customer` (nome, telefone) + e-mail do `User`.
- Nunca exponha ao painel o histórico do usuário em outras barbearias.

## 5. Host e cabeçalhos
- A barbearia é descoberta pelo host em `middleware.ts` (`resolveHost`). O header `x-tenant-rewrite` é
  removido de toda requisição recebida e só o middleware o define: nunca confie nele vindo do cliente.
- Slugs reservados ficam em `RESERVED_SLUGS` (`src/lib/tenancy/host.ts`).

## Checklist para PR
- [ ] Toda query nova de dado de barbearia tem `tenantId`?
- [ ] Toda action nova do painel chama `requirePanel` com a permissão mínima?
- [ ] Algum id vindo do cliente é usado sem conferir o `tenantId`?
- [ ] Alguma tela em `/t/[tenant]` mostra algo da plataforma?
