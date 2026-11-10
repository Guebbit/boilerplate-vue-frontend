---
source: src/app/components/LegalPlaceholder.vue
sha256: 109a93aa0209ce5104f14ecceba450f8a3fc49af6298fe6e0626d0304870e793
signature: cccfa76a375e2760ad9dc48c57312e4e72b60608dc11adb7faab11e2054fd270
generated_at: 2026-11-10T02:52:33.828239+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/LegalPlaceholder.vue

## Purpose
A stand-in rendered on the Terms and Privacy pages until the operator writes real legal copy. It displays a warning alert ("text is missing") and a headings-only checklist of what the real text must cover. It deliberately contains **no** legal wording so a multi-tenant demo cannot ship words a shop might mistake for its own.

## Key elements
- **`props.page`** (`'terms' | 'privacy'`) — selects which page's i18n keys to resolve.
- **`sections`** (computed) — resolves the translated list of required section headings via `staticPageParagraphs` from `@/app/utils/static-pages.ts`.
- **`t` / `tm` / `rt`** — standard `vue-i18n` helpers; `tm` + `rt` are used together to build the heading list, `t` for the notice and checklist title.
- **`<script>` (named block)** — supplies `name: 'LegalPlaceholder'` so `<KeepAlive>` and devtools can identify the component (not possible from `<script setup>` alone).
- **Template** — a `v-alert` warning, a bold checklist title, and a `<ul>` of section headings, all keyed off the `page` prop.

## Notes
- The eslint-disable on the `useI18n()` destructuring is required by vue-i18n's documented pattern; do not "fix" the `unbound-method` warning.
- Legal text is **expected to bypass the runtime i18n dictionary** and ship with a `NODE_TERMS_VERSION` stamp; this placeholder exists only until the operator swaps the component in the view before go-live.
- The component is intentionally non-configurable beyond the `page` prop — it has no slots, no model, and no API surface for injecting content.
