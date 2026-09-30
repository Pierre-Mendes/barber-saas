# ADR 0005 — Redis para cache e rate limit

**Status:** aceita

## Contexto
Sendo white-label, **toda** página de barbearia precisa descobrir o tenant pelo host/slug, e os horários livres
são recalculados a cada clique no calendário. Com muitas barbearias isso vira carga repetida no Postgres.
Além disso, login por link mágico e reservas precisam de proteção contra abuso.

## Decisão
- Redis (`REDIS_URL`) com três caches: barbearia por chave de rota (5 min), horários livres (60 s) e vitrine
  (2 min). Código em `src/lib/cache/`.
- Invalidação por **versão**: grupos de chaves incluem um número de versão (`schedule:<tenant>`,
  `marketplace`, `marketplace:user:<id>`); qualquer mudança só incrementa a versão.
- A gravação de um agendamento **nunca** usa cache (`fresh: true`); a constraint do banco continua sendo a
  garantia final.
- Rate limit de janela fixa (INCR + EXPIRE) para link mágico (por e-mail, por IP e no próprio provider) e
  reservas.
- **Fail-open:** se o Redis cair, tudo continua funcionando direto no banco (sem rate limit).
- Sem `REDIS_URL` (dev/testes), um store em memória do processo substitui o Redis.

## Consequências
- Menos consultas repetidas; página da barbearia sai do cache na maioria dos acessos.
- Dados podem ficar até o TTL defasados onde não há invalidação explícita (ex.: contagem de atendimentos).
- Toda mutação que afeta horários precisa chamar `invalidateSchedule` (checado na revisão e documentado em
  [cache-and-storage.md](../conventions/cache-and-storage.md)).
