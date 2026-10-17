---
source: src/modules/stats/components/MermaidChart.vue
sha256: 4d095c44c7eda04d7759c94398d72f7546595e512e0aec479f551395c6d1e64b
generated_at: 2026-10-17T01:40:05.127925+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/components/MermaidChart.vue

## Purpose

Renders a Mermaid diagram source string as an inline SVG element inside the stats view. It dynamically imports the `mermaid` library only on demand (keeping it out of the entry bundle), attaches the resulting SVG via `DOMParser` rather than `innerHTML`, and exposes a translated failure message if rendering throws. The component exists to give `ChartWithTable.vue` a visual chart paired with an accessible data table.

## Key elements

- **Props** — `definition: string` (Mermaid source, sourced from `domain/mermaid.ts`) and `label: string` (accessible name; the actual data lives in the sibling table view).
- **`render()`** — The sole rendering path. Increments `renderCounter`, dynamically `import('mermaid')`, calls `mermaid.initialize` (strict security, `startOnLoad: false`, `suppressErrorRendering: true`, theme derived from Vuetify), calls `mermaid.render` with a unique id, parses the returned SVG string with `DOMParser`, and calls `host.value.replaceChildren(...)`. Sets `failed` to `true` on any rejection.
- **Race / unmount guards** — `renderCounter` ensures a slow earlier render never overwrites a newer one; the `unmounted` flag stops DOM mutation after `onBeforeUnmount`.
- **`watch`** — Re-renders when `props.definition` changes *or* when Vuetify's dark-mode flag flips.
- **Template** — A `role="img"` host `div` (ref `host`, min-height 32) plus a `role="status"` paragraph shown when `failed` is `true`, with the i18n key `stats-page.chart-failed`.

## Relationships

- **`src/modules/stats/domain/mermaid.ts`** — Produces the `definition` string passed as a prop; the component never accepts raw user text.
- **`src/modules/stats/components/ChartWithTable.vue`** — Parent/neighbor that composes this chart alongside a data table, giving the user both a visual and a text representation of the same statistics.
- **`src/modules/stats/tests/mermaid-chart.spec.ts`** — Unit-test spec covering this component's rendering, failure, and theme-switch behavior.

## Notes

- **Two `<script>` blocks:** the plain `<script>` exists solely to set `name: 'MermaidChart'` for `<KeepAlive>` / devtools, since `<script setup>` cannot declare a component name.
- **SVG injection:** the library returns an SVG *string*; it is parsed with `DOMParser('image/svg+xml')` and the root element is spliced in via `replaceChildren`. `innerHTML` is never used, and `securityLevel: 'strict'` prevents clickable nodes or raw HTML in labels.
- **`suppressErrorRendering: true`** means a syntax error in the definition throws a rejected promise (caught → `failed = true`) instead of drawing Mermaid's "bomb" placeholder into the page.
- **Theme is one-way:** the component reads `theme.current.value.dark` at render time to pick Mermaid's `'dark'` or `'default'` theme. It does not subscribe to Mermaid's own theme API.
- **`data-test` hooks:** `stats-chart` on the wrapper and `stats-chart-failed` on the error paragraph are the selectors used in the spec.
