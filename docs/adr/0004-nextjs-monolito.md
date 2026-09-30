# ADR 0004 — Next.js como monólito (front + back em Node.js)

**Status:** aceita

## Contexto
Stack em Node.js, com Docker, entregando rápido com poucas pessoas.

## Decisão
Uma aplicação Next.js 15 (App Router): páginas com Server Components, mutações com Server Actions, rotas de
API só para o que precisa de URL (auth, `.ics`, push, cron, health). Regras de negócio em `src/lib`, sem
dependência de React, para poderem migrar para uma API separada se for preciso.

## Consequências
- Um deploy, um repositório, tipos compartilhados de ponta a ponta.
- Se surgir app mobile nativo, expor `src/lib` via rotas de API (as regras já estão isoladas).
