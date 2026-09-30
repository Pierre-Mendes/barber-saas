<div align="center">

# ✂️ Barber SaaS

**Agendamento online para barbearias, multi-tenant e white-label.**

Cada barbearia tem o próprio link, a própria marca, a equipe com níveis de acesso e uma agenda por barbeiro.
O cliente agenda em segundos, recebe lembrete por e-mail e no celular e salva o horário na agenda que usa.

![Next.js](https://img.shields.io/badge/Next.js-15-000?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6-2d3748?logo=prisma)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06b6d4?logo=tailwindcss&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-compose-2496ed?logo=docker&logoColor=white)

<img src="docs/screenshots/home-mobile.jpg" width="200" alt="Home do cliente" />
<img src="docs/screenshots/barbearia-mobile.jpg" width="200" alt="Página da barbearia" />
<img src="docs/screenshots/reserva-sheet-resumo-mobile.jpg" width="200" alt="Reserva" />
<img src="docs/screenshots/confirmacao-mobile.jpg" width="200" alt="Confirmação" />

</div>

---

## Sumário

- [Funcionalidades](#funcionalidades)
- [Telas](#telas)
- [Arquitetura](#arquitetura)
- [Níveis de acesso](#níveis-de-acesso)
- [Notificações e calendários](#notificações-e-calendários)
- [Como rodar](#como-rodar)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Scripts](#scripts)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Testes e qualidade](#testes-e-qualidade)
- [Deploy em produção](#deploy-em-produção)
- [Roadmap](#roadmap)

## Funcionalidades

### Para o cliente
- **Vitrine para quem tem conta:** todas as barbearias do app, com as **favoritas no topo** e ordenação por
  **atendimentos realizados** (mais populares) ou "onde eu mais fui".
- **Busca** por nome, bairro ou serviço, com atalhos por categoria (Cabelo, Barba, Acabamento, Massagem,
  Sobrancelha, Hidratação).
- **Reserva em poucos toques:** serviço → profissional → dia → horário livre → confirmar.
- **Lembretes** por e-mail (confirmação e 24h antes) e **notificação no celular** (Web Push, sem WhatsApp).
- **Salvar na agenda:** Google Agenda, Outlook e Apple Calendar (`.ics`).
- **Meus agendamentos:** confirmados e finalizados, com detalhes, mapa, telefones e cancelamento dentro do
  prazo definido pela barbearia.
- Login sem senha: **link por e-mail** (ou Google, se configurado).

### Para a barbearia
- **Link próprio para divulgar:** `sua-barbearia.seuapp.com.br`, domínio próprio (`agenda.suabarbearia.com.br`)
  ou `seuapp.com.br/t/sua-barbearia`.
- **Página white-label:** logo, capa, cor, descrição e contatos. Nenhuma menção à plataforma nem a outras
  barbearias.
- **Barbeiros com agenda individual:** expediente semanal com pausa para almoço, folgas/bloqueios e serviços
  que cada um realiza.
- **Serviços** com preço, duração e imagem.
- **Agenda do dia** com indicadores, filtro por barbeiro e ações (concluído, faltou, cancelar).
- **Agendamento pelo balcão/telefone:** a recepção agenda pelo cliente, que recebe a confirmação por e-mail.
- **Equipe e níveis de acesso:** dono, gerente, recepção e barbeiro.
- **Regras da agenda:** intervalo entre horários, antecedência mínima, prazo de cancelamento e janela de
  agendamento.

### Garantias técnicas
- **Isolamento entre barbearias:** todo acesso ao painel passa por uma checagem de vínculo com a barbearia.
  Uma barbearia não enxerga clientes, agendas nem a existência das outras.
- **Sem agendamento duplicado:** constraint `EXCLUDE USING gist` no PostgreSQL impede horários sobrepostos
  para o mesmo barbeiro, mesmo com cliques simultâneos.
- **Fuso horário correto** por barbearia, sem dependências externas.

## Telas

| Cliente (celular) | | |
|---|---|---|
| <img src="docs/screenshots/home-mobile.jpg" width="240" /><br/>Home | <img src="docs/screenshots/menu-mobile.jpg" width="240" /><br/>Menu | <img src="docs/screenshots/barbearia-mobile.jpg" width="240" /><br/>Página da barbearia |
| <img src="docs/screenshots/reserva-sheet-resumo-mobile.jpg" width="240" /><br/>Reserva | <img src="docs/screenshots/confirmacao-mobile.jpg" width="240" /><br/>Confirmação | <img src="docs/screenshots/detalhe-reserva-mobile.jpg" width="240" /><br/>Detalhe do agendamento |

**Home no desktop e landing page**

<img src="docs/screenshots/home-desktop.jpg" width="49%" /> <img src="docs/screenshots/landing-desktop.jpg" width="49%" />

**Painel da barbearia**

<img src="docs/screenshots/admin-agenda-desktop.jpg" width="49%" /> <img src="docs/screenshots/admin-barbeiro.jpg" width="49%" />
<img src="docs/screenshots/admin-equipe.jpg" width="49%" /> <img src="docs/screenshots/admin-personalizacao.jpg" width="49%" />

> A arte de demonstração (capas, ilustrações dos serviços e mapa) é própria, gerada por
> `node scripts/generate-demo-art.mjs`. Em produção, cada barbearia usa as próprias fotos.

## Arquitetura

Aplicação única em **Next.js (Node.js)**: páginas com React Server Components, mutações via Server Actions
e rotas de API para autenticação, `.ics`, Web Push e cron.

```mermaid
flowchart LR
    subgraph Hosts
        A["seuapp.com.br<br/>(plataforma)"]
        B["navalha.seuapp.com.br<br/>(subdomínio)"]
        C["agenda.navalha.com.br<br/>(domínio próprio)"]
    end
    A & B & C --> M["middleware.ts<br/>resolve o host"]
    M -->|plataforma| P["/ · /explore · /bookings<br/>/admin · /onboarding"]
    M -->|barbearia| T["/t/[tenant]<br/>página white-label"]
    P & T --> S["Server Actions<br/>+ serviços de domínio"]
    S --> DB[("PostgreSQL")]
    S --> N["Notificações"]
    N --> E["E-mail + .ics"]
    N --> W["Web Push"]
    CR["cron (5 min)"] --> R["/api/cron/reminders"] --> N
```

### Multi-tenant

- **Um banco, `tenantId` em todas as tabelas.** O `middleware.ts` identifica pelo host se a requisição é da
  plataforma ou de uma barbearia (subdomínio ou domínio próprio) e reescreve para a rota interna
  `/t/[tenant]`.
- **O usuário é global, o `Customer` é por barbearia.** O cliente usa uma conta só, mas cada barbearia
  enxerga apenas o próprio registro dele.
- **A sessão é compartilhada** entre a plataforma e os subdomínios (cookie em `.ROOT_DOMAIN`).

### Modelo de dados (principal)

```mermaid
erDiagram
    User ||--o{ Membership : "membro de"
    User ||--o{ Customer : "cliente em"
    User ||--o{ Favorite : favorita
    User ||--o{ PushSubscription : dispositivos
    Tenant ||--o{ Membership : equipe
    Tenant ||--o{ Barber : barbeiros
    Tenant ||--o{ Service : serviços
    Tenant ||--o{ Customer : clientes
    Tenant ||--o{ Booking : agendamentos
    Barber ||--o{ WorkingHours : expediente
    Barber ||--o{ TimeOff : folgas
    Barber }o--o{ Service : "BarberService"
    Customer ||--o{ Booking : reservas
    Barber ||--o{ Booking : atende
    Service ||--o{ Booking : de
```

O schema completo está em [`prisma/schema.prisma`](prisma/schema.prisma). A migração inicial cria a
constraint `booking_no_overlap`.

## Níveis de acesso

| Permissão | Dono | Gerente | Recepção | Barbeiro |
|---|:-:|:-:|:-:|:-:|
| Personalização, link e domínio | ✅ | | | |
| Equipe e acessos | ✅ | ✅ ¹ | | |
| Barbeiros e serviços | ✅ | ✅ | | |
| Agenda de todos os barbeiros | ✅ | ✅ | ✅ | |
| Própria agenda, horários e folgas | ✅ | ✅ | | ✅ |

¹ O gerente não cria nem altera donos e gerentes. A barbearia nunca fica sem dono.

A matriz está em [`src/lib/auth/permissions.ts`](src/lib/auth/permissions.ts) e é coberta por testes.

## Notificações e calendários

| Evento | Cliente | Barbeiro |
|---|---|---|
| Agendamento confirmado | E-mail com `.ics` + push | E-mail com `.ics` + push |
| Cancelamento | E-mail (remove da agenda) + push | Push |
| Lembrete (24h antes) | E-mail com `.ics` + push | |

- **Web Push (PWA):** funciona no Android e no desktop direto do navegador. No iPhone (iOS 16.4+), depois de
  "Adicionar à Tela de Início". O cliente ativa em **"Receber lembretes no celular"**.
- **Lembretes** saem por `GET /api/cron/reminders` (protegido por `CRON_SECRET`). No docker-compose, o serviço
  `cron` chama a cada 5 minutos.

## Como rodar

### Pré-requisitos
- Docker e Docker Compose
- Node.js 22+ (para desenvolvimento fora do Docker)

### Opção 1: tudo no Docker

```bash
cp .env.example .env
npx web-push generate-vapid-keys      # cole as chaves no .env (opcional, para push)
docker compose up --build -d
docker compose --profile seed run --rm seed   # dados de demonstração
```

| Serviço | URL |
|---|---|
| Aplicação | http://localhost:3000 |
| Caixa de e-mail (Mailpit) | http://localhost:8025 |
| PostgreSQL | `localhost:5432` (postgres/postgres) |

### Opção 2: desenvolvimento

```bash
cp .env.example .env
docker compose up -d db mailpit       # só banco e e-mail
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

### Contas de demonstração

O login é por link mágico: digite o e-mail e abra o link no **Mailpit** (http://localhost:8025).

| E-mail | Perfil |
|---|---|
| `cliente@exemplo.dev` | Cliente com histórico e uma barbearia favorita |
| `dono@navalha.dev` | Dono da *Navalha de Ouro* (também atende) |
| `recepcao@navalha.dev` | Recepção da *Navalha de Ouro* |
| `ze@navalha.dev` | Barbeiro: vê só a própria agenda |
| `dono@vintage.dev` | Dono da *Vintage Barber* |

Páginas públicas: http://localhost:3000/t/navalha ou http://navalha.localhost:3000 (subdomínios de
`localhost` funcionam no Chrome e no Firefox).

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|:-:|---|
| `DATABASE_URL` | ✅ | Conexão com o PostgreSQL |
| `AUTH_SECRET` | ✅ | Segredo do Auth.js (`openssl rand -base64 32`) |
| `APP_URL` | ✅ | URL pública da plataforma (ex.: `https://seuapp.com.br`) |
| `ROOT_DOMAIN` | ✅ | Domínio raiz. As barbearias ficam em `<slug>.<ROOT_DOMAIN>` |
| `AUTH_TRUST_HOST` | ✅ | `true` para aceitar subdomínios e domínios próprios |
| `SMTP_URL` | ✅ | Servidor de e-mail (ex.: `smtps://user:pass@smtp.resend.com:465`) |
| `EMAIL_FROM` | ✅ | Remetente dos e-mails |
| `CRON_SECRET` | ✅ | Protege o endpoint de lembretes |
| `NEXT_PUBLIC_PLATFORM_NAME` | | Nome da plataforma (padrão: *Agenda Barber*) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | | Habilita o login com Google |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | | Habilitam o Web Push |
| `VAPID_SUBJECT` | | Contato do remetente do push (`mailto:…`) |

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e servidor de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | Checagem de tipos (TypeScript strict) |
| `npm test` | Testes (Vitest) |
| `npm run db:migrate` | Cria/aplica migrações em desenvolvimento |
| `npm run db:deploy` | Aplica migrações em produção |
| `npm run db:seed` | Dados de demonstração |
| `npm run vapid:generate` | Gera as chaves do Web Push |
| `node scripts/generate-demo-art.mjs` | Regera a arte de demonstração |

## Estrutura do projeto

```
├── prisma/
│   ├── schema.prisma              # modelo de dados
│   ├── migrations/                # inclui a constraint anti-sobreposição
│   └── seed.ts                    # 8 barbearias de demonstração
├── public/
│   ├── demo/                      # arte própria (capas, serviços, mapa)
│   └── sw.js                      # service worker do Web Push
├── src/
│   ├── middleware.ts              # resolve host → plataforma ou barbearia
│   ├── auth.ts                    # Auth.js (link por e-mail + Google)
│   ├── app/
│   │   ├── (platform)/            # home, busca, agendamentos, cadastro
│   │   ├── t/[tenant]/            # página white-label, reserva, agendamentos
│   │   ├── admin/[slug]/          # painel: agenda, barbeiros, serviços, equipe, personalização
│   │   ├── actions/               # server actions do cliente
│   │   ├── api/                   # auth, .ics, push, cron, health
│   │   └── login/
│   ├── components/
│   │   ├── ui/                    # button, card, sheet, dialog, calendar…
│   │   └── admin/                 # navegação e blocos do painel
│   └── lib/
│       ├── auth/                  # permissões e guards de acesso
│       ├── booking/               # criação, cancelamento, disponibilidade
│       ├── scheduling/            # cálculo de horários e fuso
│       ├── calendar/              # .ics e links do Google/Outlook
│       ├── notifications/         # e-mail, push, lembretes
│       ├── marketplace/           # vitrine e ranking
│       └── tenancy/               # host, URLs e resolução da barbearia
├── tests/                         # unitários + integração com Postgres
├── Dockerfile
└── docker-compose.yml             # app, postgres, mailpit, cron, seed
```

## Testes e qualidade

```bash
npm test                     # unitários
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/barber_test npm test   # + integração
```

Os testes cobrem:
- cálculo de disponibilidade: expediente, pausa, folgas, antecedência e horário de verão;
- resolução de host (subdomínio, domínio próprio, slugs reservados);
- permissões e escalonamento de papéis;
- geração do `.ics` e dos links de calendário;
- ranking da vitrine e escape de HTML nos e-mails.

A integração roda contra um **PostgreSQL real** e cobre:
- reserva e cancelamento;
- isolamento entre barbearias;
- **três reservas simultâneas no mesmo horário**, das quais só uma passa.

O CI (GitHub Actions) roda lint, typecheck, testes e build a cada push.

## Deploy em produção

1. **Banco:** PostgreSQL 16 (Supabase, Neon, RDS…). Rode `npm run db:deploy`.
2. **Domínio:** aponte `seuapp.com.br` e o wildcard `*.seuapp.com.br` para a aplicação. Configure
   `ROOT_DOMAIN=seuapp.com.br` e `APP_URL=https://seuapp.com.br`.
3. **Domínios próprios das barbearias:** cada barbearia cria um CNAME para a plataforma e cadastra o domínio
   em *Personalização*. O host precisa emitir SSL para ele (Vercel Domains, Caddy on-demand TLS ou
   Cloudflare for SaaS).
4. **E-mail:** qualquer SMTP (Resend, Amazon SES, Brevo) via `SMTP_URL`.
5. **Lembretes:** agende `GET /api/cron/reminders` com `Authorization: Bearer $CRON_SECRET` a cada 5 minutos
   (Vercel Cron, crontab ou o serviço `cron` do compose).
6. **Imagem Docker:** o `Dockerfile` gera um build *standalone* e aplica as migrações ao iniciar.

## Roadmap

- [ ] Login em domínios próprios (hoje o login compartilhado funciona nos subdomínios)
- [ ] Painel do super admin (planos, suspensão, controle da vitrine)
- [ ] Cobrança da assinatura (Asaas / Mercado Pago / Stripe) com limites por plano
- [ ] Upload de imagens (hoje logo, capa e fotos são URLs)
- [ ] Row Level Security no PostgreSQL como segunda camada de isolamento
- [ ] Relatórios: faturamento por barbeiro, taxa de faltas, horários de pico
- [ ] Avaliações dos atendimentos (alimentando a vitrine)
- [ ] Remarcação pelo cliente

---

<sub>Interface inspirada no projeto educacional
[fullstackweek-barber-v2](https://github.com/felipemotarocha/fullstackweek-barber-v2), usado apenas como referência.
O código e a arte deste repositório foram escritos do zero.</sub>
