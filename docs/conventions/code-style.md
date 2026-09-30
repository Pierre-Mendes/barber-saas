# Estilo de código

## Linguagem
- **TypeScript strict.** Nada de `any`; use tipos do Prisma (`@prisma/client`) e `z.infer<>` do zod.
- Identificadores em **inglês** (`createBooking`, `tenantId`). Textos de interface, mensagens de erro para o
  usuário e comentários em **português**.
- Formatação: Prettier (`semi: false`, `trailingComma: all`, largura ~120). Lint: `npm run lint`.

## Nomes
| O quê | Padrão | Exemplo |
|---|---|---|
| Arquivos | `kebab-case` | `booking-item.tsx`, `form-sheet.tsx` |
| Componentes | `PascalCase` | `BookingItem`, `ServiceItem` |
| Funções/variáveis | `camelCase` descritivo | `canManageBarberSchedule`, `isUpcoming` |
| Server Actions | verbo + `Action` (cliente) ou verbo direto (painel) | `createBookingAction`, `staffCancelBooking` |
| Constantes de módulo | `UPPER_SNAKE` | `SERVICE_CATEGORIES`, `ROLE_LABELS` |
| Booleanos | `is/has/can…` | `isFavorite`, `canCancel` |

## Estrutura
- Imports com alias `@/` (`@/lib/db`), nunca `../../..` dentro de `src/`.
- Código só de servidor que toca headers/cookies/segredos começa com `import "server-only"`.
- Funções puras (cálculos, formatação) ficam em `src/lib` **sem** dependência de React/Next, para testar fácil.
- Chaves sempre em `if`/`for`, mesmo de uma linha.
- Prefira retorno antecipado a `if` aninhado.

## Comentários
- JSDoc curto (`/** … */`) em funções exportadas e em regras que não são óbvias. Explique **por quê**, não o quê.
- Sem comentários que repetem o código. Sem código comentado.

## Datas e dinheiro
- Datas no banco em UTC; conversões **só** pelas funções de `src/lib/scheduling/time.ts` (`zonedToUtc`,
  `toLocalDate`, `formatDateTime`). Nunca `new Date("2026-10-05")` para "dia local".
- Dinheiro é `Decimal(10,2)` no banco; formate com `formatCurrency` (`src/lib/utils.ts`).
