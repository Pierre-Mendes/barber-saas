---
description: Implementa uma funcionalidade de ponta a ponta seguindo o harness (contexto → plano → código → testes → check → revisão)
argument-hint: "<descrição da funcionalidade>"
---

Funcionalidade: $ARGUMENTS

1. **Contexto:** faça o que `/context` descreve (RAG → `.harness/features` → `codegraph_explore`). Se a área for
   grande, delegue a varredura ao subagente `explorer`.
2. **Plano curto** (até 8 itens): arquivos, migração (se houver), testes. Se houver decisão de produto
   ambígua, pergunte antes de codar.
3. **Implementação** seguindo `docs/conventions/` (server actions, multi-tenancy, ui, database). Prefira editar por
   símbolo com Serena em arquivos grandes.
4. **Testes:** use o subagente `test-writer`.
5. **Check:** `npm run lint && npm run typecheck && npm test` (e `npm run build` se mexeu em rotas/páginas).
6. **Revisão:** subagente `tenancy-reviewer` sobre o diff; corrija os bloqueantes.
7. **Documentação:** atualize o YAML em `.harness/features/` e a convenção/ADR se o fluxo ou uma regra mudou;
   termo novo do domínio → `docs/glossary.md` + `GLOSSARY` em `scripts/rag/lib.mjs`.

Ao final, resuma: o que mudou, como foi verificado (comandos e resultado real) e o que ficou pendente.
