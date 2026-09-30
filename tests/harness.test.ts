import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const ROOT = path.resolve(import.meta.dirname, "..")
const FEATURES = path.join(ROOT, ".harness/features")

/** Extrai pares (file, symbol) dos YAMLs, nas formas em bloco e inline. */
function references(yaml: string): { file: string; symbol: string }[] {
  const refs: { file: string; symbol: string }[] = []
  const inline = /\{\s*file:\s*([^,}]+),\s*symbol:\s*([^}\s]+)\s*\}/g
  for (const match of yaml.matchAll(inline)) {
    refs.push({ file: match[1].trim(), symbol: match[2].trim() })
  }
  const lines = yaml.split("\n")
  lines.forEach((line, index) => {
    const file = /^\s*file:\s*(\S+)\s*$/.exec(line)
    const symbol = /^\s*symbol:\s*(\S+)\s*$/.exec(lines[index + 1] ?? "")
    if (file && symbol) {
      refs.push({ file: file[1], symbol: symbol[1] })
    }
  })
  return refs
}

describe(".harness/features", () => {
  const files = fs.readdirSync(FEATURES).filter((name) => name.endsWith(".yaml"))

  it("has feature pipelines", () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it.each(files)("%s only references files and symbols that exist", (name) => {
    const yaml = fs.readFileSync(path.join(FEATURES, name), "utf8")
    const refs = references(yaml)
    expect(refs.length).toBeGreaterThan(0)
    for (const ref of refs) {
      const full = path.join(ROOT, ref.file)
      expect(fs.existsSync(full), `${name}: arquivo ${ref.file}`).toBe(true)
      const source = fs.readFileSync(full, "utf8")
      const declared = new RegExp(`(function|const|class|interface|type)\\s+${ref.symbol}\\b`).test(source)
      expect(declared, `${name}: símbolo ${ref.symbol} em ${ref.file}`).toBe(true)
    }
    for (const test of yaml.match(/tests\/[\w.-]+\.ts/g) ?? []) {
      expect(fs.existsSync(path.join(ROOT, test)), `${name}: ${test}`).toBe(true)
    }
  })
})
