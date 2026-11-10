---
source: tests/unit/app/legal-placeholder.spec.ts
sha256: 0d54e27da502aa83d67cd3f97d1a91667fc1f7ab4230fdffcf98a61918578268
signature: 4ed2d41662504d0b3d46e340379af59ab469cd9e897d583cd779ac225fd56c05
generated_at: 2026-11-10T07:47:32.841613+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/legal-placeholder.spec.ts

## Purpose

Unit tests for the `LegalPlaceholder` Vue component, which renders a visible warning and a headings-only checklist on the Terms and Privacy pages when their real content has not been written yet. The tests verify that the placeholder communicates the missing-text state and that the checklist headings are derived from the page's own i18n dictionary branch.

## Key elements

- **`vi.mock('vue-i18n', …)`** — Replaces `useI18n` so `t` returns the raw key, `tm` returns two synthetic entries (`#one`, `#two`), and `rt` is identity. This lets assertions check exact key paths without needing real translation strings.
- **`mountPlaceholder(page)`** — Helper that mounts `LegalPlaceholder` with a given `page` prop (`'terms'` or `'privacy'`) and the real Vuetify plugin.
- **`it.each(['terms','privacy'])`** — Parameterised test asserting the rendered text contains the `static-pages.{page}.placeholder.notice`, `…checklist-title`, and `…sections#one`/`#two` keys.
- **`it('puts the warning in an alert…')`** — Asserts the component renders an element with `role="alert"` so screen readers announce the missing-content warning.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The i18n mock makes `tm` return exactly two items (`#one`, `#two`), so the "lists what it must cover" assertion is really a structural smoke test, not a check of the real section list.
- The component is imported from `@/app/components/LegalPlaceholder.vue` (app-level component), while Vuetify is pulled from `@/ui/vuetify` — the test intentionally uses the real Vuetify plugin rather than mocking it, since `role="alert"` behaviour depends on `v-alert`'s rendered output.
- The `page` prop is a union literal (`'terms' | 'privacy'`); adding a new legal page would require extending both the prop type and this `it.each` list.
