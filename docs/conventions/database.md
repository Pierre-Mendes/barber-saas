# Banco de dados

## Prisma
- Schema em `prisma/schema.prisma`. Modelos em `PascalCase`, campos em `camelCase`, enums em `UPPER_SNAKE`.
- Cliente único em `src/lib/db.ts` (`db`). Não instancie `PrismaClient` em outro lugar (exceto o seed).
- Toda tabela de dado de barbearia tem `tenantId` + `@@index([tenantId, …])`.

## Migrações
- Crie com `npx prisma migrate dev --name descricao_curta`. **Nunca** edite uma migração já aplicada em
  produção; crie outra.
- Regras que o Prisma não expressa ficam em SQL na migração, com comentário: ex. `booking_no_overlap`
  (`EXCLUDE USING gist`) e os `CHECK` de `WorkingHours`.
- Ao alterar uma coluna, mantenha todos os atributos que ela já tinha.
- `prisma migrate reset` apaga dados: só em banco local descartável.

## Integridade
- **Sem sobreposição de agendamentos:** garantida no banco (`booking_no_overlap`), não só na aplicação.
  Violação chega como erro `23P01` e vira `BookingError("SLOT_TAKEN")` em `createBooking`.
- **Corridas de criação** (ex.: dois `Customer` iguais): trate `P2002` relendo o registro
  (`findOrCreateCustomer` em `src/lib/booking/service.ts`).
- Unicidade que a regra de negócio precisa → `@@unique` no schema, não checagem manual.

## Datas, fuso e dinheiro
- `DateTime` é gravado em UTC. O "dia local" da barbearia é `YYYY-MM-DD` no `Tenant.timezone`.
- Expediente (`WorkingHours`) em minutos desde meia-noite no fuso da barbearia (`540` = 09:00).
- Preço em `Decimal(10,2)`; o `Booking.price` guarda o preço **do momento** da reserva.

## Seed
- `prisma/seed.ts` é idempotente (não duplica se já existir). Contas de demonstração estão no README.
- Históricos de exemplo não podem sobrepor horários do mesmo barbeiro (a constraint barra).
