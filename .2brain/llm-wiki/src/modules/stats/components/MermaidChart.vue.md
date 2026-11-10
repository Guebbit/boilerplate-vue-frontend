---
source: src/modules/stats/components/MermaidChart.vue
sha256: 920d7df08f61eeb4e67994cc6640a632cf63db859bb9305188951bef16c21e55
signature: eaba806a6625fcf7ef90c1c392c45cea4f14d05f52f613618ebc0ba67be606c4
generated_at: 2026-11-10T05:46:05.756622+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/components/MermaidChart.vue

## Purpose

Renders a Mermaid diagram (supplied as a source string) as an inline SVG inside the stats module. It exists so the stats page can display charts without bundling the Mermaid library into the app entry—Mermaid is lazy-imported per-chart-mount, and the SVG is injected as a parsed DOM node rather than raw HTML.

## Key elements

- **Props** — `definition: string` (Mermaid source) and `label: string` (accessible name).
- **`render()`** — Dynamically imports `mermaid`, calls `mermaid.initialize` + `mermaid.render`, then replaces the host element's children with the parsed SVG root. Catches errors by setting `failed` to `true`.
- **`renderCounter`** — Monotonically increasing guard so a slow earlier render never overwrites a newer one.
- **`unmounted`** — Boolean set in `onBeforeUnmount`; checked before any DOM write to avoid touching a removed component.
- **`host` (ref)** — The `<div>` the SVG is attached to; also carries `role="img"` and `:aria-label`.
- **`failed` (ref)** — Drives the "chart failed" message in the template; the sibling table view still shows the data.
- **`watch`** on `[props.definition, theme.current.value.dark]` — Re-renders when the source or light/dark mode changes.
- **Dual `<script>` blocks** — The non-setup block exists solely to declare `name: 'MermaidChart'` (needed for `<KeepAlive>` / devtools, since `<script setup>` cannot set it).

## Relationships

- **`src/modules/stats/domain/mermaid.ts`** — Produces the `definition` string passed to this component's `definition` prop. The comment in the prop explicitly notes the source comes from that module and is never raw user text.
- **`src/modules/stats/components/ChartWithTable.vue`** — Parent/companion component; the `label` prop is described as the chart's accessible name whose underlying data lives in that component's "show as table" view.
- **`src/modules/stats/tests/mermaid-chart.spec.ts`** — Unit tests for this component (render success, render failure, unmount safety, etc.).

## Notes

- **Security:** `securityLevel: 'strict'` is set on every render; the SVG is parsed via `DOMParser` and attached with `replaceChildren`—never `innerHTML`. No clickable nodes or raw HTML in labels.
- **Code-splitting:** The `import('mermaid')` call keeps the library out of the entry bundle; it ships only in the stats route chunk.
- **Theme reactivity:** Re-renders on dark-mode toggle by watching `theme.current.value.dark` and passing Mermaid's `'dark'` / `'default'` theme names.
- **`suppressErrorRendering: true`** — A syntax error in the definition throws (caught by the `.catch` handler) instead of drawing Mermaid's default error graphic into the DOM.
- **`data-test` attributes** — `stats-chart` and `stats-chart-failed` are the hooks used by the spec file.
