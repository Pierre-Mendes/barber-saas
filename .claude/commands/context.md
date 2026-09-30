---
description: Monta o contexto mínimo para uma tarefa (RAG + codegraph) antes de começar
argument-hint: "<descrição da tarefa>"
---

Tarefa: $ARGUMENTS

Monte o contexto gastando o mínimo de tokens:

1. `docs_search` com os termos da tarefa (k=5) → convenções e trechos relevantes.
2. Se existir, leia o pipeline da funcionalidade em `.harness/features/` (arquivos curtos).
3. `codegraph_explore` com o assunto → símbolos, código atual e dependentes. Não releia o que ele já mostrou.
4. Liste as convenções aplicáveis (só os nomes dos arquivos de `docs/conventions/`).

Entregue um resumo de até ~20 linhas:
- arquivos/símbolos que provavelmente mudam (`caminho:linha`);
- invariantes que não podem quebrar (multi-tenancy, sobreposição, fuso…);
- testes que cobrem a área;
- dúvidas em aberto, se houver.
