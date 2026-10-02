# Server Actions

Toda mutação é uma Server Action. Há dois estilos, conforme quem chama.

## Cliente (componentes interativos) — `src/app/actions/*.ts`
Retornam um resultado tipado; o componente mostra o toast.

```ts
export async function createBookingAction(input: Input): Promise<CreateBookingResult> {
  const user = await currentUser()                  // 1. autenticação (reserva aceita visitante com nome + e-mail)
  const parsed = schema.safeParse(input)            // 2. validação zod (nunca confiar no cliente)
  if (!parsed.success) return { ok: false, error: "Dados inválidos." }
  try {
    const booking = await createBooking({ ... })    // 3. regra de negócio em src/lib
    after(() => notifyBookingConfirmed(booking.id)) // 4. efeitos colaterais depois da resposta
    revalidatePath("/bookings")                     // 5. revalidação
    return { ok: true, bookingId: booking.id }
  } catch (error) {
    if (error instanceof BookingError) return { ok: false, error: error.message } // erro esperado → mensagem
    throw error                                                                 // erro inesperado → sobe
  }
}
```

## Painel (formulários) — `src/app/admin/[slug]/actions.ts`
Recebem `FormData` via `action={fn.bind(null, slug, ...)}` e **redirecionam** com mensagem:

```ts
export async function createService(slug: string, formData: FormData) {
  const ctx = await requirePanel(slug, "services.manage")           // 1. guarda (sempre, mesmo que a página já cheque)
  const parsed = parseService(formData)                             // 2. validação
  if (!parsed.success) back(`/admin/${slug}/services`, "erro", "…") // 3. volta com ?erro=
  await db.service.create({ data: { ...parsed.data, tenantId: ctx.tenant.id } }) // 4. tenantId do contexto, nunca do form
  back(`/admin/${slug}/services`, "ok", "Serviço criado.")          // 5. volta com ?ok= (vira toast via <Flash/>)
}
```

## Regras
- Erros **esperados** (horário ocupado, prazo de cancelamento) são `BookingError` com `code`; a mensagem vai
  para o usuário. Erros inesperados não são engolidos.
- `redirect()`/`back()` lançam exceção: não coloque dentro de `try` que capture tudo.
- O `tenantId` vem **sempre** de `requirePanel`/do banco, nunca de um campo do formulário.
- Notificações sempre com `after()`, nunca `await` no caminho da resposta.
- Conflito de concorrência (P2002/`23P01`) é tratado no serviço, não na action.
