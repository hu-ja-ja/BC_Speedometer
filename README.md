# Solid Personal Template

A simple personal template built with Astro + SolidJS.

The layout is intentionally minimal and easy to read, with a consistent dark visual tone.

## Stack

- Astro 6
- SolidJS
- Kobalte (primitive-based UI library, Toast demo included)
- Icons: lucide-solid + @tabler/icons-solidjs
- Fonts: IBM Plex Sans + IBM Plex Mono

## Commands

| Command | Description |
| :-- | :-- |
| `pnpm install` | Install dependencies |
| `pnpm dev` | Start local dev server |
| `pnpm check` | Run Astro type checks |
| `pnpm lint` | Run Oxlint for `src` |
| `pnpm lint:fix` | Run Oxlint auto fix |
| `pnpm build` | Type check and production build |
| `pnpm preview` | Preview built output |

## Main Files

- `src/layouts/BaseLayout.astro`: Shared page layout
- `src/pages/index.astro`: Entry page
- `src/components/TemplateShowcase.tsx`: Main showcase component
- `src/components/template-showcase.css`: Component styles
- `src/styles/global.css`: Global tokens and base styles

## Note

Start by editing `src/components/TemplateShowcase.tsx` and `src/components/template-showcase.css`
to fit your own structure and content.

`TemplateShowcase.tsx` includes a simple Toast demo built with Kobalte.
