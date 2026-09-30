# Fluxo de trabalho para agentes (economia de tokens)

Ler arquivos inteiros é o que mais gasta tokens. Neste repositório há três índices que devolvem **só o trecho
certo**. Use-os nesta ordem:

| # | Pergunta | Ferramenta | Exemplo |
|---|---|---|---|
| 1 | "Onde/como é feito X?", "qual a regra de Y?" | **barber-docs** → `docs_search` (ou `npm run rag -- "…"`) | `docs_search("prazo de cancelamento")` |
| 2 | "Preciso de contexto para mexer em X" | **codegraph** → `codegraph_explore` | `codegraph_explore("criar agendamento")`: código dos símbolos + quem depende deles |
| 3 | "Onde está o símbolo X / quem chama X?" | **Serena** → `find_symbol`, `find_referencing_symbols`, `get_symbols_overview` | `find_symbol("requirePanel")` |
| 4 | Editar uma função em arquivo grande | **Serena** → `replace_symbol_body`, `insert_after_symbol` | troca só o corpo, sem reler o arquivo |
| 5 | Último recurso | `Read` com `offset`/`limit` nas linhas indicadas | nunca o arquivo inteiro "por garantia" |

O `codegraph_explore` já devolve o código-fonte atual e numerado: **não releia** um arquivo que ele mostrou.

## Regras de economia
- Comece pela convenção do assunto (`docs/conventions/<assunto>.md`); não leia todas.
- Uma busca boa vale mais que cinco leituras. Use termos em português: o glossário traduz para o código.
- Rode só os testes afetados: `npx vitest run tests/<arquivo>.test.ts`; `codegraph affected <arquivos>` lista
  os testes impactados.
- Para tarefas amplas de leitura, delegue a um subagente barato (`.claude/agents/explorer.md`, modelo haiku)
  e receba só a conclusão.
- Não repita no chat o que já está no diff. Respostas curtas.

## Comandos úteis
```bash
npm run rag -- "pergunta" [-k 5] [--scope src/lib] [--kind doc|code|test|schema]
npx -y @colbymchenry/codegraph@1 explore "assunto"       # mesmo resultado do MCP, via terminal
npx -y @colbymchenry/codegraph@1 impact requirePanel     # o que quebra se mudar este símbolo
npx -y @colbymchenry/codegraph@1 affected src/lib/booking/service.ts
npm run codegraph:sync                                   # atualiza o índice depois de muitas mudanças
```

## Manter os índices vivos
- **RAG:** reconstrói sozinho quando algum arquivo indexado muda (`.rag/index.json`, não versionado).
- **codegraph:** o servidor MCP mantém o índice; o hook de início de sessão roda `sync`.
- **Serena:** usa o cache em `.serena/cache` (não versionado); reindexe com
  `uvx --from serena-agent serena project index`.
- Ao criar termo novo do domínio, adicione em [glossary.md](../glossary.md) **e** em `GLOSSARY`
  (`scripts/rag/lib.mjs`).
