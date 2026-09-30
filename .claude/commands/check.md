---
description: Roda lint, typecheck e testes (e build com "build") e resume só o que falhou
argument-hint: "[build]"
---

Rode em sequência, parando na primeira falha:

```bash
npm run lint
npm run typecheck
npm test
```

Se `$ARGUMENTS` contiver `build`, rode também `npm run build`.
Se houver `TEST_DATABASE_URL` no ambiente, os testes de integração rodam junto.

Responda de forma compacta: ✅/❌ por etapa. Para falhas, mostre só as linhas de erro relevantes
(`arquivo:linha — mensagem`) e a causa provável. Não cole a saída inteira.
