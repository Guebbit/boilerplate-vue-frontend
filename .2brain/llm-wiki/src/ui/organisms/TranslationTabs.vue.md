---
source: src/ui/organisms/TranslationTabs.vue
sha256: 5086c369e6f4623060f781f5252a2640058fad8e31f172e37daaf57691ad2324
generated_at: 2026-10-17T01:58:49.269136+00:00
model: ollama:qwen3.8:27b
---

# src/ui/organisms/TranslationTabs.vue

## Purpose

A shared, purely presentational tab bar for every per-locale translation screen (product create/edit forms and the generic entity-translations screen). It renders one tab per open locale, provides an "add language" picker, and exposes a single remove button. All state and data ownership lives with the caller via `v-model` and events.

## Key elements

- **`TranslationTabLocale`** (exported interface) — narrowed locale shape (`tag`, `nativeName`, `direction`) consumed by the component.
- **Props** — `locales` (full active-locale list), `openTags` (display order of open tabs), `fallbackTag` (locale that cannot be removed), `errorCounts` (optional per-tab error badge data).
- **`activeTab`** (`defineModel<string | undefined>`) — the currently selected tab, owned by the caller.
- **Emits** — `add(tag)` when a new locale is picked from the closed-locales select; `remove(tag)` when the remove button is clicked.
- **`openLocales`** (computed) — resolves `openTags` against the `locales` manifest; falls back to bare tag / `ltr` if the manifest hasn't loaded.
- **`closedLocales`** (computed) — active locales with no open tab, fed into the "add language" `<v-select>`.
- **`activeLocale`** (computed) — the row for the currently active tab, used to drive the remove button's label and visibility.
- **`handlePick`** — emits `add` and resets the select so it reads as a one-shot action.

## Relationships

No graph neighbors. The component is fully self-contained; the caller supplies locale data, tab order, and validation counts, and listens for `add`/`remove` events.

## Notes

- The remove `<v-btn>` is deliberately a **sibling** of `<v-tabs>`, not a child. Placing it inside `role="tablist"` triggers axe `aria-required-children`; inside a `role="tab"` triggers `nested-interactive`. The sibling placement is the only layout that satisfies both rules.
- Each `<v-tab>` carries `id="translation-tab-{tag}"` and `aria-controls="translation-panel-{tag}"`. The **caller** must complete the pattern by adding `role="tabpanel"` and `aria-labelledby` to the matching `v-window-item`.
- The remove button is hidden when the active tab is the fallback locale — the caller treats a `null` on the fallback slot as a 422, so the UI never offers the destructive action.
- `errorCounts` is optional; omit it entirely when the screen has no per-tab validation (e.g., the generic entity-translations screen).
- Tab order is **not** managed here. The caller is expected to use `useTranslationTabOrder` (referenced in the module docstring) to keep the fallback locale first.
