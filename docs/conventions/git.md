# Git, commits e PRs

## Branches
- `main` sempre verde e implantável.
- Trabalho em branch: `feat/<assunto>`, `fix/<assunto>`, `docs/<assunto>`, `chore/<assunto>`.

## Commits (Conventional Commits, em português)
```
<tipo>: <resumo no imperativo, até ~70 caracteres>

<corpo opcional: o porquê, em tópicos curtos>
```
Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `ci`.

Exemplos:
- `feat: permitir remarcação pelo cliente`
- `fix: evitar P2002 em reservas simultâneas do mesmo cliente`

## Pull requests
- Um assunto por PR. Descreva **o que** mudou e **como foi verificado** (comandos, capturas de tela).
- Checklist: lint, typecheck, testes e build passando; checklist de
  [multi-tenancy](multi-tenancy.md) quando tocar dados ou painel.
- Mudança de schema → migração nova no mesmo PR.

## Nunca
- Commitar `.env`, índices locais (`.codegraph/`, `.rag/`, `.serena/cache`) ou `node_modules`.
- Reescrever histórico de `main`.
