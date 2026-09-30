# ADR 0003 — Notificações por e-mail e Web Push (sem WhatsApp no MVP)

**Status:** aceita

## Contexto
O cliente precisa de confirmação, lembrete e de salvar o horário na agenda. WhatsApp é pago por mensagem.

## Decisão
- E-mail (SMTP/Nodemailer) com anexo `.ics` e links para Google/Outlook.
- Web Push (VAPID) via PWA para "notificação no celular", sem custo.
- Lembretes por um endpoint protegido chamado por cron a cada 5 minutos (idempotente via `reminderSentAt`).

## Consequências
- Custo zero. No iPhone, o push exige instalar o app na tela inicial (iOS 16.4+).
- WhatsApp pode entrar depois como recurso de plano pago.
