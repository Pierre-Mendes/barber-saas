export interface Chunk {
  id: string
  path: string
  kind: string
  title: string
  startLine: number
  endLine: number
  text: string
}

export interface IndexedChunk extends Chunk {
  length: number
  tf: Record<string, number>
}

export interface RagIndex {
  version: number
  builtAt: string
  files: Record<string, number>
  avgLength: number
  df: Record<string, number>
  docs: IndexedChunk[]
}

export const ROOT: string
export const INDEX_PATH: string
export const GLOSSARY: Record<string, string[]>
export function tokenize(text: string): string[]
export function chunkMarkdown(relPath: string, content: string): Chunk[]
export function chunkCode(relPath: string, content: string, kind?: string): Chunk[]
export function collectFiles(root?: string): { file: string; kind: string }[]
export function buildIndex(root?: string): RagIndex
export function search(
  index: RagIndex,
  query: string,
  options?: { k?: number; scope?: string; kind?: string },
): { doc: IndexedChunk; score: number }[]
export function loadIndex(options?: { rebuild?: boolean }): RagIndex
export function formatResults(results: { doc: IndexedChunk; score: number }[], options?: { snippetLines?: number }): string
