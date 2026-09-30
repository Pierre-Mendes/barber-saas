#!/usr/bin/env node
/**
 * Busca no RAG local.
 *   npm run rag -- "como funciona o cancelamento"            (5 resultados)
 *   npm run rag -- "requirePanel" -k 3 --scope src/lib
 *   npm run rag -- --rebuild                                 (só reconstrói o índice)
 */
import { formatResults, loadIndex, search } from "./lib.mjs"

const args = process.argv.slice(2)
const option = (name) => {
  const index = args.indexOf(name)
  if (index === -1) {
    return undefined
  }
  const [, value] = args.splice(index, 2)
  return value
}
const rebuild = args.includes("--rebuild")
const k = Number(option("-k") ?? 5)
const scope = option("--scope")
const kind = option("--kind")
const query = args.filter((arg) => arg !== "--rebuild").join(" ")

const index = loadIndex({ rebuild })
if (!query) {
  console.log(`Índice com ${index.docs.length} trechos (${index.builtAt}).`)
  process.exit(0)
}
console.log(formatResults(search(index, query, { k, scope, kind })))
