# Testes

## Ferramentas
- **Vitest** (`npm test`). Arquivos em `tests/*.test.ts`.
- Integração com banco: `tests/*.db.test.ts`, rodam só com `TEST_DATABASE_URL` definido (banco descartável).
  O CI sempre define.

```bash
npm test                                                          # unitários
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/barber_test npm test   # + integração
npx vitest run tests/scheduling.test.ts                           # um arquivo
```

## O que testar
| Mudou… | Teste |
|---|---|
| Cálculo de horários, fuso | `tests/scheduling.test.ts` (funções puras, datas fixas) |
| Permissões, papéis, host | `tests/tenancy-and-permissions.test.ts` |
| Regras de agendamento, concorrência, isolamento | `tests/booking.db.test.ts` (Postgres real) |
| `.ics`, e-mail, ranking | `tests/calendar-and-marketplace.test.ts` |
| Catálogo, RAG | `tests/catalog.test.ts`, `tests/rag.test.ts` |

## Regras
- Todo bug corrigido ganha um teste que falhava antes.
- Teste o comportamento e os modos de falha importantes; não teste detalhes de implementação.
- Datas fixas (`new Date("2030-01-01T12:00:00Z")`), nunca "agora" em asserções. Serviços aceitam `now`.
- Integração: limpe as tabelas no `beforeEach` e use dados mínimos.
- Teste instável é bug: investigue antes de repetir. (A corrida de `Customer` foi achada assim.)

## Antes de abrir PR
```bash
npm run lint && npm run typecheck && npm test && npm run build
```
Para mudanças de interface, rode o app e confira a tela no celular (390px) e no desktop.
