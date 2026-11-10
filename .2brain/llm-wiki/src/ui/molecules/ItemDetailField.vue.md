---
source: src/ui/molecules/ItemDetailField.vue
sha256: 1f80a71d932ab5c406611803950ea0c2a59f5a98b9fd1c806202d416c64090f0
signature: cc111fbfee8631042a557ec73cbe4e7771f65efdf27a4ed8c7728bfa5c23bf18
generated_at: 2026-11-10T06:27:38.104249+00:00
model: ollama:qwen3.8:27b
---

# src/ui/molecules/ItemDetailField.vue

## Purpose

Atomic, read-only presentational component that renders a single label/value pair for use inside detail pages. It standardises the visual treatment of one row (icon tile + label + value) so that detail views only compose these fields rather than duplicating layout markup.

## Key elements

- **`props`** — `label` (string), `value` (string | number | null), `icon` (Vue `Component`), `fullWidth` (boolean). The value prop is the single source of truth for what is displayed.
- **`displayValue` (computed)** — Stringifies `props.value`; returns the shared `EMPTY_VALUE` sentinel (imported from `@/infrastructure/utils/formatters.ts`) when the value is `undefined`, `null`, or `''`.
- **Template** — An `<article>` with a 12×12 accent tile (icon rendered at size 20, `aria-hidden`) and a text block. The value area is wrapped in a default **slot**, so callers can override the rendered value with arbitrary markup. `fullWidth` toggles `col-span-full` on the article for grid layouts.

## Notes

- The `icon` prop must be a Vue component (a `lucide-vue-next` import), **not** an emoji or glyph string. The JSDoc explicitly documents this to prevent regressions to font-dependent characters.
- The icon tile is purely decorative (`aria-hidden="true"`); screen-reader access to the field comes from the `label` paragraph.
- Because the value is in a slot, consumers that override the slot are responsible for handling the empty-value case themselves — `displayValue` only guards the default fallback.
- The accent colour is read from the `--detail-accent` CSS custom property (set by the parent view) via Tailwind's `from-detail-accent` / `text-detail-accent` utilities.
- `grid-cols-term` is a project-level grid-template utility; the component assumes it exists in the consuming view's Tailwind config.
