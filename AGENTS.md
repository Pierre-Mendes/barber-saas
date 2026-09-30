# AGENTS.md

SaaS multi-tenant de agendamento para barbearias. Next.js 15 (App Router, Server Actions) + Prisma 6 +
PostgreSQL 16 + Auth.js v5 + Tailwind 4. Tudo em Node.js; Docker para rodar.

## Antes de ler código (economize tokens)
1. `docs_search` (MCP **barber-docs**) ou `npm run rag -- "pergunta"` → trecho certo de docs/código.
2. `codegraph_explore("assunto")` (MCP **codegraph**) → código relevante + quem depende dele. Não releia o que ele mostrou.
3. Serena `find_symbol` / `find_referencing_symbols` / `replace_symbol_body` → navegar e editar por símbolo.
4. `Read` só com `offset`/`limit`.

Detalhes: [docs/ai/agent-workflow.md](docs/ai/agent-workflow.md). Convenções: [docs/README.md](docs/README.md)
(leia só a do assunto).

## Regras invioláveis
- **Isolamento:** toda query de dado de barbearia filtra por `tenantId`; todo acesso/action do painel chama
  `requirePanel(slug, permissão)`; ids vindos do cliente são conferidos contra o `tenantId`.
  → [multi-tenancy.md](docs/conventions/multi-tenancy.md)
- **White-label:** nada em `/t/[tenant]` mostra a plataforma ou outras barbearias.
- **Entradas** validadas com zod; `tenantId` nunca vem do formulário.
- **Datas** só via `src/lib/scheduling/time.ts`; dinheiro em `Decimal` + `formatCurrency`.
- **Sobreposição** de horários é garantida pela constraint `booking_no_overlap`: não remova.
- Identificadores em inglês; UI, mensagens e comentários em português.

## Comandos
```bash
npm run dev                      # app em http://localhost:3000 (precisa de db + mailpit: docker compose up -d db mailpit)
npm run lint && npm run typecheck
npm test                         # unitários
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/barber_test npm test   # + integração
npx vitest run tests/<arquivo>.test.ts                                                 # só o afetado
npx prisma migrate dev --name <nome>   # mudou o schema
npm run db:seed                  # dados de demonstração (logins no README)
npm run rag -- "pergunta"        # busca local em docs + código
```

## Mapa
- `src/app/(platform)` home, busca, agendamentos, cadastro · `src/app/t/[tenant]` página white-label ·
  `src/app/admin/[slug]` painel · `src/app/actions` actions do cliente · `src/middleware.ts` host → barbearia
- `src/lib/{tenancy,auth,scheduling,booking,notifications,calendar,marketplace}` regras de negócio
- `src/components/ui` primitivos (shadcn) · `src/components/admin` painel
- `.harness/features/*.yaml` fluxo de cada funcionalidade → funções que o implementam

## Definição de pronto
Lint, typecheck, testes afetados e build passando; teste novo para bug corrigido; `.harness/features` e docs
atualizados se o fluxo mudou; checklist de multi-tenancy no PR quando tocar dados ou painel.
