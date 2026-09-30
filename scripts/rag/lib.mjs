// @ts-check
/**
 * RAG local e sem custo: índice BM25 sobre a documentação e o código do projeto.
 * Serve para o agente achar o trecho certo sem ler arquivos inteiros (economia de tokens).
 */
import fs from "node:fs"
import path from "node:path"

export const ROOT = path.resolve(import.meta.dirname, "../..")
export const INDEX_PATH = path.join(ROOT, ".rag", "index.json")

/** Arquivos indexados (relativos à raiz). */
export const SOURCES = [
  { dir: "docs", exts: [".md"], kind: "doc" },
  { dir: ".harness", exts: [".yaml", ".yml", ".md"], kind: "doc" },
  { dir: "src", exts: [".ts", ".tsx"], kind: "code" },
  { dir: "tests", exts: [".ts"], kind: "test" },
  { dir: "prisma", exts: [".prisma"], kind: "schema" },
  { dir: "scripts", exts: [".mjs"], kind: "code" },
]
export const ROOT_FILES = ["README.md", "CLAUDE.md", "AGENTS.md", "docker-compose.yml", ".env.example"]

const STOPWORDS = new Set(
  (
    "a o as os de da do das dos e em no na nos nas um uma uns umas para por com sem que se ao aos " +
    "é ou mas como mais foi ser ter the of and to in is for on with as by an be this that it from " +
    "or are at const let return import export from type interface function async await new true false null undefined"
  ).split(" "),
)

/**
 * Glossário do domínio (PT → termos usados no código). Expande a consulta para que
 * "cancelamento" encontre `cancelBooking` e "barbearia" encontre `tenant`.
 * Mantenha em sincronia com docs/glossary.md.
 */
export const GLOSSARY = {
  agendamento: ["booking"],
  agendamentos: ["booking"],
  reserva: ["booking"],
  cancelamento: ["cancel", "cancelled"],
  cancelar: ["cancel"],
  barbearia: ["tenant"],
  barbearias: ["tenant"],
  barbeiro: ["barber"],
  barbeiros: ["barber"],
  servico: ["service"],
  servicos: ["service"],
  cliente: ["customer"],
  clientes: ["customer"],
  horario: ["slot", "startsat"],
  horarios: ["slot"],
  disponibilidade: ["availability", "available", "slot"],
  favorita: ["favorite"],
  favoritas: ["favorite"],
  vitrine: ["marketplace", "explore"],
  equipe: ["membership", "team"],
  papel: ["role"],
  permissao: ["permission", "can"],
  acesso: ["permission", "requirepanel"],
  lembrete: ["reminder"],
  lembretes: ["reminder"],
  notificacao: ["notification", "notify", "push"],
  agenda: ["schedule", "calendar"],
  calendario: ["calendar", "ics"],
  folga: ["timeoff"],
  folgas: ["timeoff"],
  expediente: ["workinghours", "working"],
  fuso: ["timezone"],
  painel: ["admin", "panel"],
  dono: ["owner"],
  gerente: ["manager"],
  recepcao: ["receptionist"],
  personalizacao: ["settings", "brand"],
  cor: ["color", "brand"],
  dominio: ["domain", "host"],
  login: ["auth", "signin"],
  sobreposicao: ["overlap"],
  duplicado: ["overlap"],
  imagem: ["image", "storage", "upload"],
  imagens: ["image", "storage", "upload"],
  upload: ["storage", "image"],
  foto: ["photo", "image"],
  logo: ["logo", "image"],
  capa: ["banner", "image"],
  armazenamento: ["storage", "s3"],
  cache: ["cache", "redis", "cached"],
  limite: ["rate", "limit"],
  tentativas: ["rate", "limit"],
}

function expandQuery(tokens) {
  const expanded = [...tokens]
  for (const token of tokens) {
    for (const extra of GLOSSARY[token] ?? []) {
      expanded.push(...tokenize(extra))
    }
  }
  return expanded
}

/** Normaliza (minúsculas, sem acento), separa camelCase e remove stopwords. */
export function tokenize(text) {
  return text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token))
    .map((token) => (token.length > 4 && token.endsWith("s") ? token.slice(0, -1) : token))
}

/**
 * @typedef {{ id: string, path: string, kind: string, title: string, startLine: number, endLine: number, text: string }} Chunk
 */

const MAX_CHUNK_LINES = 60

/** Markdown: um pedaço por seção (título ##/###), quebrando seções muito longas. */
export function chunkMarkdown(relPath, content) {
  const lines = content.split("\n")
  /** @type {Chunk[]} */
  const chunks = []
  let start = 0
  let title = path.basename(relPath)
  const flush = (end) => {
    const text = lines.slice(start, end).join("\n").trim()
    if (text) {
      for (let s = start; s < end; s += MAX_CHUNK_LINES) {
        const e = Math.min(end, s + MAX_CHUNK_LINES)
        chunks.push({ id: `${relPath}:${s + 1}`, path: relPath, kind: "doc", title, startLine: s + 1, endLine: e, text: lines.slice(s, e).join("\n") })
      }
    }
  }
  lines.forEach((line, index) => {
    const heading = /^#{1,3}\s+(.*)/.exec(line)
    if (heading && index > start) {
      flush(index)
      start = index
    }
    if (heading) {
      title = heading[1].trim()
    }
  })
  flush(lines.length)
  return chunks
}

const DECLARATION = /^(export\s+)?(default\s+)?(async\s+)?(function|const|class|interface|type|enum|model)\s+([A-Za-z0-9_]+)/

/** Código: um pedaço por declaração de topo (com o JSDoc logo acima). */
export function chunkCode(relPath, content, kind = "code") {
  const lines = content.split("\n")
  /** @type {{ line: number, name: string }[]} */
  const starts = []
  lines.forEach((line, index) => {
    const match = DECLARATION.exec(line)
    if (match) {
      let begin = index
      while (begin > 0 && /^\s*(\/\*\*|\*|\*\/|\/\/)/.test(lines[begin - 1])) {
        begin--
      }
      starts.push({ line: begin, name: match[5] })
    }
  })
  if (starts.length === 0 || starts[0].line > 0) {
    starts.unshift({ line: 0, name: path.basename(relPath) })
  }
  /** @type {Chunk[]} */
  const chunks = []
  starts.forEach((current, i) => {
    const end = i + 1 < starts.length ? starts[i + 1].line : lines.length
    for (let s = current.line; s < end; s += MAX_CHUNK_LINES) {
      const e = Math.min(end, s + MAX_CHUNK_LINES)
      const text = lines.slice(s, e).join("\n")
      if (text.trim()) {
        chunks.push({ id: `${relPath}:${s + 1}`, path: relPath, kind, title: current.name, startLine: s + 1, endLine: e, text })
      }
    }
  })
  return chunks
}

function walk(dir, exts) {
  if (!fs.existsSync(dir)) {
    return []
  }
  /** @type {string[]} */
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!["node_modules", "migrations", "screenshots", ".next", "rag"].includes(entry.name)) {
        files.push(...walk(full, exts))
      }
    } else if (exts.includes(path.extname(entry.name))) {
      files.push(full)
    }
  }
  return files
}

/** Lista os arquivos que entram no índice. */
export function collectFiles(root = ROOT) {
  const files = SOURCES.flatMap((source) =>
    walk(path.join(root, source.dir), source.exts).map((file) => ({ file, kind: source.kind })),
  )
  for (const name of ROOT_FILES) {
    const file = path.join(root, name)
    if (fs.existsSync(file)) {
      files.push({ file, kind: "doc" })
    }
  }
  return files
}

/** Constrói o índice BM25 (documentos = pedaços). */
export function buildIndex(root = ROOT) {
  /** @type {Chunk[]} */
  const chunks = []
  /** @type {Record<string, number>} */
  const files = {}
  for (const { file, kind } of collectFiles(root)) {
    const rel = path.relative(root, file)
    files[rel] = fs.statSync(file).mtimeMs
    const content = fs.readFileSync(file, "utf8")
    const ext = path.extname(file)
    chunks.push(...(ext === ".md" || ext === ".yaml" || ext === ".yml" || !ext ? chunkMarkdown(rel, content) : chunkCode(rel, content, kind)))
  }
  /** @type {Record<string, number>} */
  const df = {}
  const docs = chunks.map((chunk) => {
    // Caminho e título contam em dobro: costumam ser o melhor sinal.
    const tokens = [...tokenize(chunk.path), ...tokenize(chunk.title), ...tokenize(chunk.title), ...tokenize(chunk.text)]
    /** @type {Record<string, number>} */
    const tf = {}
    for (const token of tokens) {
      tf[token] = (tf[token] ?? 0) + 1
    }
    for (const token of Object.keys(tf)) {
      df[token] = (df[token] ?? 0) + 1
    }
    return { ...chunk, length: tokens.length, tf }
  })
  const avgLength = docs.reduce((sum, doc) => sum + doc.length, 0) / Math.max(1, docs.length)
  return { version: 2, builtAt: new Date().toISOString(), files, avgLength, df, docs }
}

const K1 = 1.2
const B = 0.75
const KIND_BOOST = { doc: 1.15, schema: 1.1, code: 1, test: 0.8 }

/**
 * Busca BM25. `scope` filtra por prefixo de caminho (ex.: "docs", "src/lib").
 * @param {ReturnType<typeof buildIndex>} index
 * @param {string} query
 * @param {{ k?: number, scope?: string, kind?: string }} [options]
 */
export function search(index, query, options = {}) {
  const terms = [...new Set(expandQuery(tokenize(query)))]
  const total = index.docs.length
  const results = []
  for (const doc of index.docs) {
    if (options.scope && !doc.path.startsWith(options.scope)) {
      continue
    }
    if (options.kind && doc.kind !== options.kind) {
      continue
    }
    let score = 0
    for (const term of terms) {
      const tf = doc.tf[term]
      if (!tf) {
        continue
      }
      const idf = Math.log(1 + (total - index.df[term] + 0.5) / (index.df[term] + 0.5))
      score += (idf * tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * doc.length) / index.avgLength))
    }
    if (score > 0) {
      results.push({ doc, score: score * (KIND_BOOST[doc.kind] ?? 1) })
    }
  }
  return results.sort((a, b) => b.score - a.score).slice(0, options.k ?? 5)
}

/** Índice atual, ou reconstruído se algum arquivo foi criado, alterado ou removido. */
export function loadIndex({ rebuild = false } = {}) {
  if (!rebuild && fs.existsSync(INDEX_PATH)) {
    const index = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"))
    const current = collectFiles().map(({ file }) => [path.relative(ROOT, file), fs.statSync(file).mtimeMs])
    const known = index.files ?? {}
    const unchanged =
      index.version === 2 &&
      current.length === Object.keys(known).length &&
      current.every(([rel, mtime]) => known[rel] === mtime)
    if (unchanged) {
      return index
    }
  }
  const index = buildIndex()
  fs.mkdirSync(path.dirname(INDEX_PATH), { recursive: true })
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index))
  return index
}

/** Formata resultados de forma compacta (economiza tokens). */
export function formatResults(results, { snippetLines = 12 } = {}) {
  if (results.length === 0) {
    return "Nenhum resultado. Tente outros termos (em português ou nomes de funções)."
  }
  return results
    .map(({ doc, score }) => {
      const snippet = doc.text.split("\n").slice(0, snippetLines).join("\n")
      const more = doc.endLine - doc.startLine + 1 > snippetLines ? `\n… (até a linha ${doc.endLine})` : ""
      return `### ${doc.path}:${doc.startLine}-${doc.endLine} · ${doc.title} · score ${score.toFixed(2)}\n${snippet}${more}`
    })
    .join("\n\n")
}
