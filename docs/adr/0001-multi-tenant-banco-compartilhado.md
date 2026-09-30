# ADR 0001 — Multi-tenant com banco compartilhado e `tenantId`

**Status:** aceita

## Contexto
Muitas barbearias pequenas, custo zero no início, uma equipe só para manter.

## Decisão
Um único PostgreSQL; toda tabela de dado de barbearia tem `tenantId`. O isolamento é garantido na aplicação
por `requirePanel` e por filtros `tenantId` ([regras](../conventions/multi-tenancy.md)). A barbearia é
descoberta pelo host (subdomínio, domínio próprio ou `/t/<slug>`).

## Consequências
- Barato e simples de migrar e fazer backup.
- Um bug de filtro pode vazar dados → regras obrigatórias, testes de isolamento e checklist no PR.
- Próximo passo planejado: Row Level Security no Postgres como segunda camada.
