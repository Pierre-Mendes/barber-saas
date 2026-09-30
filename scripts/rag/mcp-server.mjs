#!/usr/bin/env node
/**
 * Servidor MCP (stdio) do RAG local: expõe a busca na documentação e no código
 * para agentes (Claude Code, Cursor…). Configurado em .mcp.json como "barber-docs".
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"
import { formatResults, loadIndex, search } from "./lib.mjs"

const server = new McpServer({ name: "barber-docs", version: "1.0.0" })

server.registerTool(
  "docs_search",
  {
    title: "Buscar na documentação e no código",
    description:
      "Busca BM25 nas convenções (docs/), harness, schema Prisma e código. Use ANTES de ler arquivos inteiros: " +
      "retorna só os trechos relevantes com caminho e linhas. Aceita português e nomes de funções.",
    inputSchema: {
      query: z.string().min(2).describe("O que procurar, ex.: 'regras de cancelamento', 'requirePanel'"),
      k: z.number().int().min(1).max(15).optional().describe("Quantidade de resultados (padrão 5)"),
      scope: z.string().optional().describe("Prefixo de caminho, ex.: 'docs', 'src/lib/booking'"),
      kind: z.enum(["doc", "code", "test", "schema"]).optional().describe("Filtra pelo tipo de fonte"),
    },
  },
  async ({ query, k, scope, kind }) => {
    const results = search(loadIndex(), query, { k: k ?? 5, scope, kind })
    return { content: [{ type: "text", text: formatResults(results) }] }
  },
)

server.registerTool(
  "docs_rebuild",
  {
    title: "Reconstruir índice do RAG",
    description: "Reconstrói o índice. Normalmente desnecessário: a busca reconstrói sozinha quando algum arquivo muda.",
    inputSchema: {},
  },
  async () => {
    const index = loadIndex({ rebuild: true })
    return { content: [{ type: "text", text: `Índice reconstruído: ${index.docs.length} trechos.` }] }
  },
)

await server.connect(new StdioServerTransport())
