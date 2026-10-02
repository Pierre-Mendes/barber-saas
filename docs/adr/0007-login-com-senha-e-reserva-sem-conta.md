# ADR 0007 — Login com senha e reserva sem conta

**Status:** aceita

## Contexto
O login só por link mágico se mostrou lento e confuso nos testes: cada entrada exige abrir o e-mail, e a
equipe (dono, recepção, barbeiro) entra várias vezes por dia. Ao mesmo tempo, exigir conta para agendar
afasta o cliente que só quer marcar um corte.

## Decisão
- **E-mail + senha** vira o login padrão (provider Credentials `password`, sessão JWT). Hash **scrypt** de
  `node:crypto` (sem dependência nativa). O link por e-mail continua como "esqueci a senha / entrar sem senha".
- Cadastro com senha não confirma o e-mail. Se o dono real do e-mail entrar por link ou Google, a senha
  definida antes da confirmação é apagada (evita sequestro prévio de conta).
- **Reserva sem conta:** `Customer.userId` passa a ser opcional e o cliente é identificado por
  `(tenantId, email)`. Cada `Booking` ganha um `accessToken` (192 bits) que vai no link do e-mail e permite
  ver, baixar o `.ics` e cancelar sem login. A recepção agenda pelo balcão no mesmo modelo (sem criar usuário).
- Ao entrar com e-mail confirmado, `linkGuestCustomers` liga as reservas feitas sem conta à conta.
- **Regra de cancelamento** por barbearia (`CancellationPolicy`): até X horas antes, até X minutos depois de
  agendar, ou só pela barbearia. Lógica pura em `src/lib/booking/policy.ts`.
- Em desenvolvimento, atalhos de **acesso rápido** às contas do seed (`DEMO_LOGINS`).

## Consequências
- Mais uma superfície de ataque (senha): rate limit por e-mail e IP, comparação em tempo constante, mensagem
  genérica de erro.
- Push só chega para quem tem conta; visitante recebe só e-mail.
- O `accessToken` é um segredo em URL: não vai para eventos de calendário e tem o mesmo peso de um link de
  redefinição de senha (não expira enquanto a reserva existir).
