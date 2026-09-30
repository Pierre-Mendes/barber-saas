# CLAUDE.md

@AGENTS.md

## Específico do Claude Code
- MCP do projeto (`.mcp.json`): **barber-docs** (RAG), **codegraph**, **serena**, já habilitados em
  `.claude/settings.json`.
- Subagentes: `explorer` (leituras amplas, barato), `tenancy-reviewer`, `test-writer`.
- Comandos: `/context <tarefa>`, `/feature <descrição>`, `/check`, `/review`.
- Para varreduras grandes, delegue ao `explorer` em vez de ler dezenas de arquivos no contexto principal.
