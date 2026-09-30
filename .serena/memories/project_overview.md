# barber-saas — visão rápida

- Instruções canônicas: AGENTS.md. Convenções: docs/conventions/*.md (leia só a do assunto).
- Fluxos por funcionalidade (etapa → arquivo/símbolo): .harness/features/*.yaml.
- Regras: tenantId em toda query de barbearia; requirePanel em todo acesso/action do painel;
  /t/[tenant] sem marca da plataforma; datas via src/lib/scheduling/time.ts.
- Busca barata: MCP barber-docs (docs_search) e codegraph (codegraph_explore) antes de ler arquivos.
