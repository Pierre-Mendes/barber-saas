# ADR 0002 — Sobreposição de agendamentos impedida no banco

**Status:** aceita

## Contexto
Dois clientes podem clicar no mesmo horário ao mesmo tempo. Checar só na aplicação ("está livre?" → "grava")
tem janela de corrida.

## Decisão
Constraint `booking_no_overlap` (`EXCLUDE USING gist` com `btree_gist`) sobre `(barberId, tsrange(startsAt,
endsAt))` para status `CONFIRMED`/`COMPLETED`. A aplicação ainda valida a disponibilidade antes (mensagem
melhor), mas a garantia é do banco.

## Consequências
- Nenhuma reserva dupla, mesmo sob concorrência (coberto por teste com 3 reservas simultâneas).
- Erro `23P01` é traduzido para `BookingError("SLOT_TAKEN")`.
- Seeds e scripts também precisam respeitar a regra.
