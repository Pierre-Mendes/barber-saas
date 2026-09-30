/**
 * Aplica a cor da barbearia no :root. Necessário porque painéis e diálogos
 * (Sheet/Dialog) são renderizados fora da árvore, direto no <body>.
 */
export function BrandStyle({ color }: { color: string }) {
  const safe = /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#8162ff"
  return <style>{`:root{--brand:${safe}}`}</style>
}
