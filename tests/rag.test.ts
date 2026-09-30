import { describe, expect, it } from "vitest"
import { buildIndex, chunkCode, chunkMarkdown, search, tokenize } from "../scripts/rag/lib.mjs"

describe("RAG local", () => {
  it("normalizes accents, splits camelCase and drops stopwords", () => {
    expect(tokenize("Cancelamento do requirePanel")).toEqual(["cancelamento", "require", "panel"])
  })

  it("chunks markdown by heading", () => {
    const chunks = chunkMarkdown("docs/x.md", "# Título\nintro\n## Seção A\ntexto a\n## Seção B\ntexto b")
    expect(chunks.map((c) => c.title)).toEqual(["Título", "Seção A", "Seção B"])
    expect(chunks[1]).toMatchObject({ startLine: 3, endLine: 4 })
  })

  it("chunks code by top-level declaration, keeping its JSDoc", () => {
    const code = 'import x from "y"\n\n/** Soma. */\nexport function soma() {}\n\nexport const outra = 1\n'
    const chunks = chunkCode("src/a.ts", code)
    expect(chunks.map((c) => c.title)).toEqual(["a.ts", "soma", "outra"])
    expect(chunks[1].text).toContain("/** Soma. */")
  })

  it("finds code from a Portuguese question using the domain glossary", () => {
    const index = buildIndex()
    const [top] = search(index, "cancelamento de agendamento pelo cliente", { scope: "src/lib" })
    expect(top.doc.path).toBe("src/lib/booking/service.ts")
    expect(top.doc.title).toBe("cancelBooking")
  })
})
