---
source: src/app/views/Home.vue
sha256: d7a324dcf1cefd700845eecf465e508c2848b96a0cb9b33861483bfcfa45bf9b
signature: d030c3bfa1e955fa37a0aac0eedf0c68099feee5af0c4e52caa13318ccd32924
generated_at: 2026-11-10T02:59:19.717325+00:00
model: ollama:qwen3.8:27b
---

# src/app/views/Home.vue

## Purpose

The application's landing page. Renders a static hero card (title, description, optional CTA button) and a responsive grid of three translated showcase cards. Exists as the default route view that users see on first load.

## Key elements

- **`name: 'HomePage'`** — Declared in a separate `<script>` block because `<script setup>` cannot set a component name. Required for `<KeepAlive>` matching and DevTools labeling.
- **`hasProductsList`** (computed) — Checks `router.hasRoute('ProductsList')` so the hero CTA button renders only when the products domain is included in the build. Prevents a dead button when `src/modules.ts` excludes that module.
- **`featuredProducts`** (computed) — Returns three card objects (title, description, accent, icon). Re-evaluates on locale change because it calls `t()`.
- **`routerLinkI18n`** — Imported from `@/i18n/router-link.ts`; produces a localized `:to` path for the ProductsList route.
- **`CardInfo`** — UI organism (`@/ui/organisms/CardInfo.vue`) used for each showcase card; receives title, description, accent, and a slot-provided icon.
- **`.hero-card`** (scoped style) — Sets CSS custom properties (`--glow-color`, `--glow-strength`, etc.) consumed by the `.surface-glow` utility in `main.css` to produce a theme-aware glow.

## Relationships

No graph neighbors recorded.

## Notes

- **Dual script blocks are intentional.** The plain `<script>` exists solely to declare `name`; the `<script setup>` holds all logic. Do not merge them.
- **Cross-domain coupling is limited to one route string.** The `'ProductsList'` route name is a plain string — no type-safe reference. If that module is removed, the `hasRoute` guard hides the button; there is no compile-time signal.
- **`v-if="hasProductsList"`** gates the button, not just its target. The button is absent from the DOM when the route doesn't exist.
- **Accent values** (`primary`, `secondary`, `tertiary`) are typed as `ThemeAccent` from `@/ui/types.ts` and passed through to `CardInfo`; they map to theme CSS variables rather than hardcoded colors.
