# Harness para agentes

Tudo o que prepara um agente de IA (Claude Code, Cursor, Codex…) para trabalhar neste repositório.

```
AGENTS.md                 # instruções canônicas para qualquer agente
CLAUDE.md                 # Claude Code: importa AGENTS.md
.mcp.json                 # servidores MCP do projeto: codegraph, serena, barber-docs
.claude/
  settings.json           # permissões, MCP habilitados, hooks
  agents/                 # subagentes especializados (explorer, tenancy-reviewer, test-writer)
  commands/               # comandos /check, /feature, /review, /context
.harness/features/*.yaml  # pipelines de cada funcionalidade: etapas → funções reais do código
.serena/project.yml       # configuração do Serena (versionada); cache/ não é versionado
.codegraph/               # índice do codegraph (não versionado)
scripts/harness/          # scripts dos hooks
scripts/rag/              # RAG local (índice BM25 + CLI + servidor MCP)
docs/                     # convenções, arquitetura, ADRs, glossário
```

## Servidores MCP (`.mcp.json`)
| Servidor | O que dá | Requisito |
|---|---|---|
| `codegraph` | Grafo de símbolos e chamadas: `codegraph_explore` devolve código relevante + raio de impacto | Node 20+ (`npx`) |
| `serena` | Navegação e edição semântica via LSP (`find_symbol`, `replace_symbol_body`…) | [uv](https://docs.astral.sh/uv/) (`uvx`) |
| `barber-docs` | RAG local: `docs_search` nas convenções, schema e código | `npm install` |

No Claude Code, os três ficam habilitados por `enabledMcpjsonServers` em `.claude/settings.json`.

## Hooks
- **SessionStart** → `scripts/harness/session-start.sh`: instala dependências se faltarem, gera o Prisma
  Client, atualiza o índice do RAG e sincroniza o codegraph em segundo plano.

## Subagentes (`.claude/agents/`)
| Agente | Modelo | Para quê |
|---|---|---|
| `explorer` | haiku | Varreduras de leitura; devolve só a conclusão |
| `tenancy-reviewer` | sonnet | Revisa o diff contra multi-tenancy e segurança |
| `test-writer` | sonnet | Escreve testes seguindo `docs/conventions/testing.md` |

## Comandos (`.claude/commands/`)
| Comando | Faz |
|---|---|
| `/check` | lint + typecheck + testes (e build, se pedir) |
| `/feature <descrição>` | Fluxo completo: contexto → plano → implementação → testes → check |
| `/review` | Revisão do diff atual com o `tenancy-reviewer` |
| `/context <tarefa>` | Monta o contexto mínimo (RAG + codegraph) antes de começar |

## Pipelines (`.harness/features/`)
Descrevem, por funcionalidade, as etapas da requisição e **qual função implementa cada etapa**, com as
invariantes e os testes que as cobrem. Servem de mapa rápido: um agente lê o YAML (poucas linhas) em vez de
percorrer o código. Ao mudar o fluxo, atualize o YAML no mesmo PR.
