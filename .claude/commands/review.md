---
description: Revisa o diff atual contra multi-tenancy, segurança e convenções
---

1. Use o subagente `tenancy-reviewer` sobre o diff atual.
2. Em paralelo, confira rapidamente as convenções gerais do diff (`docs/conventions/code-style.md`,
   `docs/conventions/ui.md` se houver UI): nomes, imports `@/`, textos em português, uso de `components/ui`.
3. Rode `npm run lint && npm run typecheck`.

Responda com uma lista única ordenada por gravidade (bloqueante → sugestão), cada item como
`arquivo:linha — problema — correção sugerida`. Seja breve.
