---
source: tests/unit/ui/page-size-select.spec.ts
sha256: 6d9073b65d6d3a58c3dfb281d65c5c4d0dafd6803d1984983028dfae38ded8a6
signature: a04680b31c04fb3e5599ba741eadcf5a19995689190d9c77b3509314bb786253
generated_at: 2026-11-10T08:27:59.931350+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/page-size-select.spec.ts

## Purpose

Unit tests for the `PageSizeSelect.vue` component, verifying that its thin wrapper logic — default size mapping, label fallback, `v-model` passthrough, and the `data-test` hook — behaves as intended without exercising Vuetify's own menu/overlay internals.

## Key elements

- **`mountSelect(props?)`** — Helper that mounts `PageSizeSelect` with Vuetify + i18n plugins and a default `modelValue: 10`; optional `props` override the defaults.
- **`describe('…the offered sizes')`** — Asserts that `VSelect`'s `items` prop equals the expected `{ value, label }` array for both the default `DEFAULT_PAGE_SIZES` set and a caller-supplied `sizes` prop.
- **`describe('…the label')`** — Confirms the rendered text falls back to the i18n "Page size" string and renders a caller-provided `label` when given.
- **`describe('…the test hook')`** — Verifies the component sets `data-test="page-size"` on the underlying `VSelect` so all callers inherit the selector.
- **`describe('…the model')`** — Checks `modelValue` is forwarded to `VSelect` and that `update:modelValue` events are re-emitted unmodified.
- **`beforeAll(() => loadLocale('en'))`** — Loads the English locale once for the i18n plugin used in every mount.

## Relationships

No graph-neighbor files are recorded for this spec.

## Notes

- Tests deliberately **do not** open the Vuetify dropdown; they read `VSelect`'s own `items` / `modelValue` props. The comment explains the rationale: Vuetify's overlay teleports to `document.body` (same pattern as `reauth-dialog.spec.ts`), and the component under test is the mapping logic, not Vuetify's menu.
- `DEFAULT_PAGE_SIZES` is imported from a separate `page-size-options.ts` module, keeping the test assertion in sync with the source of truth rather than hard-coding `[10, 25, 50]` in both places.
- The `label` fallback assertion checks `wrapper.text()` (rendered output) rather than a prop, confirming the i18n pipeline actually produces the visible string.
