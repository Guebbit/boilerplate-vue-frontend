---
source: tests/unit/ui/translation-tabs.spec.ts
sha256: b8eeda07d89daa0b5a82a9b92326e8dde4c1465c9d237b029e52d7e0a888ef29
generated_at: 2026-10-17T02:47:33.695939+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/translation-tabs.spec.ts

## Purpose

Unit-test guard for the ARIA shape of `TranslationTabs.vue`'s tab bar. It asserts that the remove button lives **outside** the `role="tablist"` (satisfying both `nested-interactive` and `aria-required-children`), that it emits `remove` with the correct tag, and that each tab exposes `id`/`aria-controls` for a caller to pair with a panel. Exists as a sub-second regression guard where a full e2e axe sweep is too slow to run on every commit.

## Key elements

- **`LOCALES`** – Two LTR locale fixtures (`en`, `it`) used as props for every mount.
- **`mountTabs(activeTab?)`** – Mounts `TranslationTabs` with two open tabs, `fallbackTag: 'en'`, Vuetify + i18n plugins, and `attachTo: document.body`.
- **`auditTablist(root)`** – Runs axe-core scoped to exactly two rules: `nested-interactive` and `aria-required-children`.
- **Describe: "tablist shape"** – (1) axe audit returns zero violations; (2) the remove button is a sibling *outside* `[role=tablist]` and carries `aria-label="Remove Italiano"`.
- **Describe: "remove control acts on the active tab"** – (1) button is absent when the fallback tab (`en`) is active; (2) clicking it while `it` is active emits `remove` with `['it']`.
- **Describe: "tab/panel link"** – The `it` tab carries `id="translation-tab-it"` and `aria-controls="translation-panel-it"`.

## Relationships

No graph neighbors are registered for this file. It imports under test: `@/ui/organisms/TranslationTabs.vue`, `@/ui/vuetify`, and `@/i18n` (the latter only to register the i18n plugin on mount).

## Notes

- `attachTo: document.body` is **required** — axe's `nested-interactive` / `aria-required-children` rules only evaluate against a real layout tree, not a detached fragment.
- `wrapper.element as Element` cast works around TypeScript-ESLint's inability to resolve the SFC's element type from a `.vue` import.
- The axe run is intentionally limited to two rules (not a full audit) to keep the test fast and the failure message focused.
- The file header documents *why* the remove button must be outside `<v-tabs>`: a focusable child inside `role="tab"` violates `nested-interactive`; a `<button>` sibling inside `role="tablist"` violates `aria-required-children`. This spec locks in the "outside" placement so a refactor doesn't silently reintroduce either violation.
