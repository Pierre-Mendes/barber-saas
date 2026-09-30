#!/usr/bin/env bash
# Hook SessionStart (Claude Code): deixa o repositório pronto para o agente sem gastar tokens.
# Idempotente e rápido quando tudo já está pronto. Não falha a sessão se algo opcional faltar.
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}" || exit 0

log() { echo "[session-start] $*" >&2; }

# 1. Dependências (só se faltarem ou o lockfile mudou)
if [ ! -d node_modules ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
  log "instalando dependências…"
  npm ci --no-audit --no-fund >/dev/null 2>&1 || npm install --no-audit --no-fund >/dev/null 2>&1 || log "npm falhou"
fi

# 2. Prisma Client (necessário para typecheck/testes)
if [ ! -d node_modules/.prisma/client ] || [ prisma/schema.prisma -nt node_modules/.prisma/client/index.js ]; then
  npx prisma generate >/dev/null 2>&1 || log "prisma generate falhou"
fi

# 3. .env local a partir do exemplo (nunca sobrescreve)
[ -f .env ] || { cp .env.example .env && log ".env criado a partir de .env.example"; }

# 4. Índice do RAG (reconstrói só se algo mudou)
node scripts/rag/search.mjs >/dev/null 2>&1 || log "RAG indisponível"

# 5. codegraph em segundo plano (init na primeira vez, sync nas demais)
if command -v npx >/dev/null 2>&1; then
  if [ -f .codegraph/codegraph.db ]; then
    (CODEGRAPH_TELEMETRY=0 npx -y @colbymchenry/codegraph@1 sync . >/dev/null 2>&1 &)
  else
    (CODEGRAPH_TELEMETRY=0 npx -y @colbymchenry/codegraph@1 init -y . >/dev/null 2>&1 &)
  fi
fi

echo "Harness pronto: use docs_search (RAG), codegraph_explore e Serena antes de ler arquivos inteiros. Veja AGENTS.md."
exit 0
