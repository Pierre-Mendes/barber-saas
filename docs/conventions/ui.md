# Interface

## Componentes
- Primitivos em `src/components/ui/` no padrão shadcn/ui: `Button`, `Card`, `Badge`, `Input`/`Field`,
  `NativeSelect`, `Avatar`, `Sheet`, `Dialog`, `Calendar`, `Toaster`. **Reaproveite** antes de criar outro.
- Variações por `cva` (`variant`, `size`); combine classes com `cn()` (`src/lib/utils.ts`).
- Componentes de domínio em `src/components/` (`BookingItem`, `ServiceItem`, `BarbershopItem`…); do painel em
  `src/components/admin/`.
- Ícones: `lucide-react`. Toasts: `sonner` (`toast.success/error`).

## Tema e cor da barbearia
- Tema escuro com tokens em `src/app/globals.css` (`bg-background`, `bg-card`, `text-muted-foreground`,
  `border`…). Não use cores fixas para superfícies.
- `primary` = `var(--brand)`. Em telas de barbearia (`/t/*`) e do painel, `<BrandStyle color=…/>` define a
  cor no `:root` — necessário porque `Sheet`/`Dialog` são renderizados fora da árvore (portal).

## Layout
- **Mobile first.** Teste em 390px de largura. Listas horizontais com `HorizontalList`/`scrollbar-none`.
- Títulos de seção com a classe `section-title` (caixa alta, pequeno, cinza).
- Formulários do painel: `FormSheet` (painel lateral) + `Field` + `SubmitButton`. Retorno com `<Flash/>`.

## Imagens
- Imagens de barbearias são URLs arbitrárias: use `<img>` simples, **não** `next/image` (o otimizador buscaria
  qualquer host no servidor).
- Sem imagem → `serviceFallbackImage(nome)` / `tenantFallbackCover(id)` (`src/lib/catalog.ts`).
- Arte de demonstração: `node scripts/generate-demo-art.mjs` (SVG próprio; não use assets de terceiros).

## Textos
- Português do Brasil, frases curtas, sem jargão técnico para o cliente final.
- Datas/horas sempre com `Intl` no fuso da barbearia (`formatDateTime`, `formatTime`).
- Na página white-label, nada da marca da plataforma.

## Acessibilidade
- Botões só com ícone têm `aria-label`. Campos têm `label` (`Field`). Foco visível (já no `Button`/`Input`).
