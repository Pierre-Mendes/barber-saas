# barber-saas

SaaS multi-tenant de agendamento para barbearias. Cada barbearia tem **o próprio link white-label**,
sua equipe com **níveis de acesso**, barbeiros com **agendas individuais**, e o cliente final recebe
**e-mail + notificação no celular** e pode **salvar no Google Agenda, Outlook ou Apple Calendar**.

Inspirado no [fullstackweek-barber-v2](https://github.com/felipemotarocha/fullstackweek-barber-v2)
(usado apenas como referência; o código daqui foi escrito do zero).

## Stack

| Camada | Tecnologia |
|---|---|
| App (front + back em Node.js) | Next.js 15 (App Router, Server Actions), React 19, TypeScript |
| Banco | PostgreSQL 16 + Prisma 6 |
| Auth | Auth.js v5: link mágico por e-mail (e Google opcional) |
| Notificações | E-mail (Nodemailer/SMTP) com `.ics` anexo + Web Push (PWA, VAPID) |
| UI | Tailwind CSS 4, componentes no padrão shadcn/ui (Radix), lucide-react, sonner (toasts) |
| Testes | Vitest (unitários + integração com Postgres real) |
| Infra | Docker / docker-compose, GitHub Actions |

## Telas

Visual inspirado no projeto base (tema escuro, mobile first):

- **Home do cliente:** saudação, busca, atalhos por serviço (Cabelo, Barba…), banner, próximos agendamentos,
  favoritas, recomendados, populares e "onde você mais vai".
- **Busca** (`/explore`): filtros por termo/categoria e ordenação por atendimentos.
- **Página da barbearia** (white-label): capa, endereço, "Sobre nós", profissionais, serviços com
  "Reservar" → painel lateral com profissional, calendário, horários, resumo e confirmação.
- **Agendamentos:** confirmados e finalizados; detalhe com mapa, resumo, telefones (copiar),
  "salvar na agenda" e cancelamento com confirmação.
- **Menu lateral e login em diálogo** (link por e-mail ou Google).
- **Painel:** barra lateral (gaveta no celular), agenda do dia com indicadores, barbeiros, serviços,
  equipe e personalização. A cor escolhida pela barbearia é aplicada em tudo.

A arte de demonstração (capas, ilustrações de serviços, mapa) é própria, gerada por
`node scripts/generate-demo-art.mjs`. As barbearias usam as próprias fotos via URL.

## Como funciona o multi-tenant

```
navalha.seuapp.com.br   ─┐
agenda.navalha.com.br   ─┼─ middleware.ts → reescreve para /t/[tenant] (white-label)
seuapp.com.br/t/navalha ─┘

seuapp.com.br           → plataforma: login, vitrine (/explore), meus agendamentos, painel (/admin), cadastro
```

- **Um banco, `tenantId` em todas as tabelas.** Todo acesso do painel passa por `requirePanel(slug, permissão)`
  (`src/lib/auth/guards.ts`), que confere se o usuário é membro *daquela* barbearia.
- **Página da barbearia white-label:** só logo, cores e textos dela. Nenhuma menção à plataforma nem a
  outras barbearias. O link é `<slug>.<ROOT_DOMAIN>`, um domínio próprio via CNAME ou `/t/<slug>` (dev).
- **O cliente é global, o `Customer` é por barbearia:** a barbearia A não sabe que o cliente também
  frequenta a B.
- **Vitrine só para clientes logados** (`/explore`): lista as barbearias, **favoritas no topo** e ordenação
  por **atendimentos concluídos** (total da barbearia ou "onde eu mais fui"). As barbearias não veem
  essa tela nem a lista das outras.
- **Sem agendamento duplicado:** constraint `EXCLUDE USING gist` no Postgres impede dois horários
  sobrepostos para o mesmo barbeiro, mesmo com cliques simultâneos.

## Níveis de acesso

| Papel | Pode |
|---|---|
| Dono | Tudo: personalização, link/domínio, equipe, barbeiros, serviços, agenda |
| Gerente | Barbeiros, serviços, agenda de todos, equipe (não cria dono/gerente) |
| Recepção | Agenda de todos os barbeiros (criar, cancelar, concluir) |
| Barbeiro | Só a própria agenda, horários e folgas |

A matriz está em `src/lib/auth/permissions.ts` (com testes). A barbearia nunca fica sem dono.

## Notificações

- **E-mail:** confirmação (cliente e barbeiro), cancelamento e lembrete 24h antes, com `agendamento.ics` anexo.
- **Celular (sem WhatsApp):** Web Push via PWA. Funciona no Android e no desktop direto do navegador. No
  iPhone (iOS 16.4+), depois de "Adicionar à Tela de Início". O cliente ativa em "Receber lembretes no celular".
- **Calendários:** botões "Google Agenda", "Outlook" e download `.ics` (Apple Calendar e outros).
- **Lembretes:** `GET /api/cron/reminders` com `Authorization: Bearer $CRON_SECRET`. O serviço `cron` do
  docker-compose chama a cada 5 min (em produção: Vercel Cron, GitHub Actions ou crontab).

## Rodando

### Tudo no Docker

```bash
cp .env.example .env
npx web-push generate-vapid-keys   # cole as chaves no .env
docker compose up --build -d
docker compose --profile seed run --rm seed   # dados de demonstração
```

- App: http://localhost:3000
- E-mails (links de login, confirmações): http://localhost:8025

### Desenvolvimento (app local, serviços no Docker)

```bash
cp .env.example .env
docker compose up -d db mailpit
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

### Contas de demonstração (login por link mágico, veja no Mailpit)

| E-mail | Papel |
|---|---|
| `dono@navalha.dev` | Dono da Navalha de Ouro (também barbeiro) |
| `recepcao@navalha.dev` | Recepção da Navalha de Ouro |
| `ze@navalha.dev` | Barbeiro (só vê a própria agenda) |
| `dono@vintage.dev` | Dono da Vintage Barber |
| `cliente@exemplo.dev` | Cliente com histórico nas duas |

Páginas públicas: http://localhost:3000/t/navalha e http://navalha.localhost:3000 (subdomínio funciona
no Chrome/Firefox).

## Testes

```bash
npm test                                   # unitários
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/barber_test npm test   # + integração
```

A integração cobre: reserva, horário fora do expediente, isolamento entre barbearias, **corrida de 3
reservas simultâneas no mesmo horário (só 1 passa)**, prazo de cancelamento e um `Customer` por barbearia.

## Produção

- Configure `ROOT_DOMAIN` (ex.: `seuapp.com.br`) e DNS wildcard `*.seuapp.com.br` → app. A sessão é
  compartilhada entre a plataforma e os subdomínios (cookie em `.seuapp.com.br`).
- Domínios próprios: a barbearia cria um CNAME e cadastra em Personalização; o host precisa emitir SSL
  para ele (Vercel Domains API, Caddy on-demand TLS, Cloudflare for SaaS).
- SMTP: qualquer provedor (Resend, SES, Brevo) via `SMTP_URL`.

## Próximos passos sugeridos

- [ ] Login nos domínios próprios (hoje o login compartilhado funciona nos subdomínios)
- [ ] Painel do super admin (planos, suspensão, vitrine)
- [ ] Cobrança da assinatura (Asaas / Mercado Pago / Stripe) e limites por plano
- [ ] Upload de imagens (hoje logo/banner/foto são URLs)
- [ ] Row Level Security no Postgres como segunda camada de isolamento
- [ ] Relatórios (faturamento por barbeiro, taxa de faltas)
- [ ] Avaliações dos atendimentos (alimentam a vitrine)
