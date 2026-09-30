# Documentação

Pasta de referência para pessoas e agentes de IA. Cada arquivo é curto e trata de **um** assunto: leia só o
que a tarefa pede.

| Arquivo | Quando ler |
|---|---|
| [architecture.md](architecture.md) | Visão geral: camadas, fluxo de uma requisição, onde fica cada coisa |
| [glossary.md](glossary.md) | Termos do domínio em português ↔ nomes no código |
| **Convenções** | |
| [conventions/code-style.md](conventions/code-style.md) | TypeScript, nomes, comentários, imports |
| [conventions/multi-tenancy.md](conventions/multi-tenancy.md) | **Regras invioláveis** de isolamento entre barbearias |
| [conventions/server-actions.md](conventions/server-actions.md) | Como escrever mutações (validação, guarda, retorno, notificação) |
| [conventions/database.md](conventions/database.md) | Prisma, migrações, datas, dinheiro, constraints |
| [conventions/ui.md](conventions/ui.md) | Componentes, tema, cor da barbearia, textos |
| [conventions/cache-and-storage.md](conventions/cache-and-storage.md) | Redis (cache, rate limit) e imagens no S3/MinIO |
| [conventions/security.md](conventions/security.md) | Autenticação, autorização, entradas, segredos |
| [conventions/testing.md](conventions/testing.md) | O que testar, onde e como rodar |
| [conventions/git.md](conventions/git.md) | Branches, commits e pull requests |
| **Decisões (ADR)** | |
| [adr/](adr/) | Por que o sistema é como é |
| **Agentes de IA** | |
| [ai/agent-workflow.md](ai/agent-workflow.md) | Como trabalhar neste repositório gastando poucos tokens |
| [ai/harness.md](ai/harness.md) | O que tem em `.claude/`, `.harness/`, `.mcp.json` e como usar |

A busca `npm run rag -- "sua pergunta"` encontra o trecho certo desta pasta (e do código) sem abrir arquivos
inteiros.
