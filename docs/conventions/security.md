# Segurança

## Autenticação
- Auth.js v5 (`src/auth.ts`): e-mail + senha (provider `password`), link mágico por e-mail e Google opcional.
  Sessão JWT.
- Senhas: `hashPassword`/`verifyPassword` (`src/lib/auth/password.ts`, scrypt com sal). E-mail inexistente
  ainda compara com um hash fixo (o tempo não revela contas). Rate limit por e-mail e por IP.
- Conta criada com senha nasce com e-mail **não confirmado**. Se o dono real do e-mail entra por link ou
  Google, a senha é apagada (callback `signIn`), o que impede alguém de "reservar" a conta de outra pessoa.
- Reservas feitas sem conta só são ligadas a uma conta (`linkGuestCustomers`) com e-mail confirmado.
- Atalhos de demonstração (`demoSignInAction`) só com `env.demoLogins` e só para os e-mails de `DEMO_ACCOUNTS`.
- Cookie de sessão compartilhado em `.ROOT_DOMAIN` (plataforma + subdomínios). Domínios próprios ainda não
  compartilham login (ver roadmap).
- Redirecionamentos pós-login só para caminho relativo ou hosts da plataforma (`redirect` callback em
  `src/auth.ts`, `safeCallback` em `src/app/actions/auth.ts`).

## Autorização
- Painel: `requirePanel(slug, permissão)` em **toda** página e action. Matriz em
  `src/lib/auth/permissions.ts`; mudanças nela exigem teste em `tests/tenancy-and-permissions.test.ts`.
- Escalonamento de papel: `assignableRoles`/`canManageMember` (gerente não cria dono/gerente). A barbearia nunca
  fica sem dono.
- Recursos do cliente (agendamento, `.ics`): confira `customer.userId === user.id` **ou** o segredo
  `Booking.accessToken` (link do e-mail, 192 bits) e responda 404/login se não for dele. O segredo nunca vai
  para o evento de calendário (que pode ser compartilhado).

## Entradas
- Tudo que vem do cliente passa por **zod** antes de uso (actions, rotas de API, `searchParams` relevantes).
- Cores entram no CSS: só `#rrggbb` (validado no salvamento e de novo em `BrandStyle`).
- URLs de imagem: `z.url()` ou caminho local; renderizadas com `<img>` (sem otimizador do Next buscando hosts).
- Upload: formato real por *magic bytes* (JPG/PNG/WebP/AVIF), até 5 MB, chave isolada por `tenantId`
  ([cache-and-storage.md](cache-and-storage.md)).
- Rate limit (Redis) no login, cadastro e reservas (com conta: por usuário; sem conta: por e-mail e IP):
  `rateLimit` + `RATE_LIMITS`.
- HTML de e-mail escapa todo dado do usuário (`escapeHtml` em `notifications/templates.ts`).

## Segredos e endpoints
- Segredos só por variável de ambiente (`.env`, nunca commitado). `.env.example` sem valores reais.
- `/api/cron/reminders` exige `Authorization: Bearer $CRON_SECRET`.
- `/api/push/subscribe` exige login; assinaturas expiradas (404/410) são apagadas.

## Dependências
- Não adicione pacotes sem necessidade. Prefira o que já existe (ver `package.json`).
