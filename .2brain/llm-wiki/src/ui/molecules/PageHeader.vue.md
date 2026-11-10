---
source: src/ui/molecules/PageHeader.vue
sha256: 2e3e5d4a108b8a6d38457f56c7dae862ad63c2b191e511b09c302acbbcfb8a88
signature: 2e3e5d4a108b8a6d38457f56c7dae862ad63c2b191e511b09c302acbbcfb8a88
generated_at: 2026-11-10T06:28:36.750049+00:00
model: ollama:qwen3.8:27b
---

# src/ui/molecules/PageHeader.vue

## Purpose
A drop-in hero header for pages whose title can't be expressed as a simple `route.meta.title` translation — dynamic text, rich markup, etc. The consuming view renders it at the top of its own body, and the default layout steps aside.

## Key elements
- **`title` prop** (optional `string`) — Fallback text shown in the `<h1>` when the default slot is *not* provided.
- **Default slot** — Full override point; a view can pass any arbitrary header markup (multi-line, badges, actions) in place of the plain `<h1>` + gradient bar.
- **Decorative gradient bar** — `h-1 w-16` rounded div with a `primary → tertiary` linear gradient; marked `aria-hidden="true"`, purely visual.

## Relationships
No graph neighbors. The file has no imports and is not imported by any other module in the dependency graph; it is consumed directly in view templates.

## Notes
- Forgetting `meta.customHero: true` on the route will cause **two** stacked headers (the layout's + this one). The prop is the only safeguard, and it lives outside this file.
- The module doc comment references `LayoutDefault` and `meta.customHero` as a coordination contract, but there is no code-level import or export linking them.
- The component has **no** imports, no emitted events, and no exposed methods — it is purely presentational and one-directional (props in, slot out).
- Tailwind classes are hard-coded in the template; there is no `v-bind` or prop-driven theming.
