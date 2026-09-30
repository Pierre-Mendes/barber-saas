/**
 * Gera a arte de demonstração (SVG) usada pelo seed: capas de barbearias,
 * ilustrações de serviços e o mapa do detalhe do agendamento.
 * Uso: node scripts/generate-demo-art.mjs
 */
import fs from "node:fs"
import path from "node:path"

const out = path.resolve(import.meta.dirname, "../public/demo")
fs.mkdirSync(path.join(out, "covers"), { recursive: true })
fs.mkdirSync(path.join(out, "services"), { recursive: true })

const scissors = (x, y, s, color, w = 6) => `
  <g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="-26" cy="40" r="16"/><circle cx="26" cy="40" r="16"/>
    <path d="M-15 28 L30 -50"/><path d="M15 28 L-30 -50"/><circle cx="0" cy="4" r="3" fill="${color}"/>
  </g>`
const razor = (x, y, s, color, w = 6) => `
  <g transform="translate(${x} ${y}) scale(${s}) rotate(-35)" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M-60 -10 H10 Q22 -10 22 2 V8 H-60 Z"/><path d="M22 0 L70 0"/><circle cx="22" cy="0" r="4" fill="${color}"/>
    <path d="M28 -6 H66 Q74 0 66 6 H28"/>
  </g>`
const comb = (x, y, s, color, w = 6) => `
  <g transform="translate(${x} ${y}) scale(${s}) rotate(-20)" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round">
    <rect x="-60" y="-18" width="120" height="18" rx="6"/>
    ${Array.from({ length: 11 }, (_, i) => `<path d="M${-52 + i * 10.4} 0 V${i % 2 ? 26 : 34}"/>`).join("")}
  </g>`
const drop = (x, y, s, color, w = 6) => `
  <g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="${color}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round">
    <path d="M0 -58 C22 -26 40 -6 40 16 A40 40 0 0 1 -40 16 C-40 -6 -22 -26 0 -58 Z"/><path d="M-18 18 A18 18 0 0 0 0 36"/>
  </g>`
const brow = (x, y, s, color, w = 6) => `
  <g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round">
    <path d="M-58 -22 Q0 -58 58 -18"/><path d="M-50 18 Q0 -18 50 18 Q0 50 -50 18 Z"/><circle cx="0" cy="18" r="12" fill="${color}"/>
  </g>`
const stones = (x, y, s, color, w = 6) => `
  <g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="${color}" stroke-width="${w}">
    <ellipse cx="0" cy="40" rx="56" ry="16"/><ellipse cx="0" cy="8" rx="42" ry="13"/><ellipse cx="0" cy="-20" rx="28" ry="10"/>
    <path d="M22 -42 Q34 -64 54 -60 Q48 -40 22 -42 Z" stroke-linejoin="round"/>
  </g>`

const ICONS = { scissors, razor, comb, drop, brow, stones }

function serviceTile(name, icons, a, b) {
  const drawn =
    icons.length === 1
      ? ICONS[icons[0]](110, 110, 1, "#fff")
      : ICONS[icons[0]](92, 104, 0.8, "#fff") + ICONS[icons[1]](128, 128, 0.7, "rgba(255,255,255,.75)")
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220" width="220" height="220">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>
  <radialGradient id="r" cx=".3" cy=".25" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
  <rect width="220" height="220" fill="url(#g)"/><rect width="220" height="220" fill="url(#r)"/>
  ${drawn}
  <title>${name}</title>
</svg>`
}

const services = {
  cabelo: [["scissors"], "#6d4aff", "#2a1a6e"],
  barba: [["razor"], "#c2410c", "#431407"],
  combo: [["scissors", "razor"], "#0e7490", "#082f49"],
  sobrancelha: [["brow"], "#be185d", "#4a0424"],
  hidratacao: [["drop"], "#0284c7", "#0c2744"],
  massagem: [["stones"], "#15803d", "#052e16"],
  acabamento: [["comb"], "#a16207", "#3b2106"],
}
for (const [file, [icons, a, b]] of Object.entries(services)) {
  fs.writeFileSync(path.join(out, "services", `${file}.svg`), serviceTile(file, icons, a, b))
}

function cover(i, [bg1, bg2, glow, accent]) {
  const stripes = Array.from({ length: 14 }, (_, k) => `<path d="M0 ${k * 36 - 60} L60 ${k * 36 - 90} V${k * 36 - 72} L0 ${k * 36 - 42} Z" fill="${k % 3 === 0 ? "#e11d48" : k % 3 === 1 ? "#f8fafc" : "#2563eb"}"/>`).join("")
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient>
    <radialGradient id="glow" cx=".72" cy=".38" r=".55"><stop offset="0" stop-color="${glow}" stop-opacity=".55"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient>
    <pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.4" fill="#fff" fill-opacity=".07"/></pattern>
    <clipPath id="pole"><rect x="0" y="0" width="60" height="330" rx="30"/></clipPath>
  </defs>
  <rect width="800" height="500" fill="url(#bg)"/>
  <rect width="800" height="500" fill="url(#dots)"/>
  <rect width="800" height="500" fill="url(#glow)"/>
  <g transform="translate(110 80)">
    <rect x="-8" y="-26" width="76" height="26" rx="10" fill="#d4d4d8"/>
    <g clip-path="url(#pole)"><rect width="60" height="330" fill="#f8fafc"/>${stripes}</g>
    <rect x="0" y="0" width="60" height="330" rx="30" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3"/>
    <rect x="18" y="0" width="10" height="330" fill="#fff" fill-opacity=".25"/>
    <rect x="-8" y="330" width="76" height="26" rx="10" fill="#d4d4d8"/>
  </g>
  <circle cx="560" cy="230" r="150" fill="none" stroke="${accent}" stroke-opacity=".35" stroke-width="3"/>
  <circle cx="560" cy="230" r="120" fill="#000" fill-opacity=".18"/>
  ${[scissors, razor, comb][i % 3](560, 230, 1.7, accent, 5)}
  ${[comb, scissors, razor][i % 3](330, 400, 0.8, "rgba(255,255,255,.35)", 5)}
  <rect y="440" width="800" height="60" fill="#000" fill-opacity=".25"/>
</svg>`
}

const palettes = [
  ["#1e1b4b", "#0b0a1a", "#7c3aed", "#c4b5fd"],
  ["#3b0764", "#120320", "#db2777", "#f9a8d4"],
  ["#422006", "#140a02", "#f59e0b", "#fde68a"],
  ["#052e16", "#020f07", "#22c55e", "#bbf7d0"],
  ["#082f49", "#020b14", "#0ea5e9", "#bae6fd"],
  ["#450a0a", "#140202", "#ef4444", "#fecaca"],
  ["#1c1917", "#0a0908", "#a8a29e", "#e7e5e4"],
  ["#172554", "#050a1c", "#6366f1", "#c7d2fe"],
]
palettes.forEach((p, i) => fs.writeFileSync(path.join(out, "covers", `cover-${i + 1}.svg`), cover(i, p)))

const map = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300" width="600" height="300">
  <rect width="600" height="300" fill="#1b1d22"/>
  <path d="M0 210 C120 180 180 260 300 230 S480 150 600 180 V300 H0 Z" fill="#12324a"/>
  <rect x="380" y="30" width="130" height="80" rx="14" fill="#16331f"/>
  <rect x="60" y="40" width="90" height="60" rx="10" fill="#16331f"/>
  <g stroke="#2e323a" stroke-width="14" stroke-linecap="round">
    <path d="M-10 130 H610"/><path d="M200 -10 V310"/><path d="M-10 60 L260 20"/><path d="M330 -10 L420 310"/>
  </g>
  <g stroke="#3a3f48" stroke-width="5"><path d="M-10 95 H610"/><path d="M110 -10 V310"/><path d="M520 -10 V310"/><path d="M-10 175 H330"/></g>
  <g stroke="#555b66" stroke-width="2" stroke-dasharray="10 10"><path d="M-10 130 H610"/><path d="M200 -10 V310"/></g>
</svg>`
fs.writeFileSync(path.join(out, "map.svg"), map)

console.log("Arte gerada em", out)
