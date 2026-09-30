# Glossário

O código usa **inglês** para identificadores; a interface e a documentação usam **português**. Esta tabela liga
os dois (o RAG usa a mesma lista em `scripts/rag/lib.mjs` → `GLOSSARY`).

| Português | No código | Observação |
|---|---|---|
| Barbearia | `Tenant` | O cliente da plataforma (SaaS) |
| Link / slug | `Tenant.slug` | `zebu` → `zebu.seuapp.com.br` |
| Domínio próprio | `Tenant.customDomain` | `agenda.zebubarber.com.br` |
| Plataforma | *platform* | Telas fora de uma barbearia (home, vitrine, painel) |
| Página white-label | `/t/[tenant]` | Página pública da barbearia |
| Vitrine | *marketplace*, `/explore` | Só para clientes logados |
| Favorita | `Favorite` | Barbearias favoritas do usuário |
| Usuário | `User` | Identidade global (e-mail) |
| Cliente (da barbearia) | `Customer` | Registro do usuário **dentro** de uma barbearia |
| Membro da equipe | `Membership` | Usuário com papel no painel |
| Papel | `Role` | `OWNER`, `MANAGER`, `RECEPTIONIST`, `BARBER` |
| Dono / Gerente / Recepção / Barbeiro | `OWNER` / `MANAGER` / `RECEPTIONIST` / `BARBER` | |
| Barbeiro (perfil de agenda) | `Barber` | Pode ou não estar ligado a um `User` |
| Serviço | `Service` | Preço + duração |
| Expediente | `WorkingHours` | Blocos semanais em minutos desde meia-noite |
| Folga / bloqueio | `TimeOff` | Período sem atendimento |
| Agendamento / reserva | `Booking` | `CONFIRMED`, `COMPLETED`, `CANCELLED`, `NO_SHOW` |
| Horário livre | *slot* | Calculado por `computeAvailableSlots` |
| Dia local | `YYYY-MM-DD` | Data no fuso da barbearia (`Tenant.timezone`) |
| Lembrete | *reminder* | E-mail + push 24h antes |
| Notificação no celular | Web Push, `PushSubscription` | Sem WhatsApp |
| Painel | `/admin/[slug]` | Gestão da barbearia |
| Personalização | *settings* | Nome, cor, logo, capa, link, regras |
| Cache | `src/lib/cache`, Redis | `cached`, versões, `invalidateSchedule` |
| Limite de tentativas | *rate limit* | `rateLimit`, `RATE_LIMITS` |
| Imagem / upload | `src/lib/storage`, S3/MinIO | `storeTenantImage`, `ImageField` |
