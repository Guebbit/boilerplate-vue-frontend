---
source: src/modules/locales/tests/entity-translations-stale.spec.ts
sha256: 7273e14c8e23438102827cedd9670638f30c481d201a983dd93fa437e76f3555
signature: fb75460528ba894dc4b7898b62ee85a7e0477c0c979a50081e301969d17c97a1
generated_at: 2026-11-10T04:43:43.146007+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/tests/entity-translations-stale.spec.ts

## Purpose

Unit test for the `EntityTranslations` screen's handling of a **412 Precondition Failed** response on save. It verifies that, when the entity has been edited since the screen loaded, the UI shows an in-place warning, offers a "reload latest" action, and that activating that action re-fetches the rows (`fetchEntityTranslations`) rather than re-attempting the save (`saveEntityTranslations`).

## Key elements

- **`store`** (hoisted mock object) — `fetchEntityTranslations` and `saveEntityTranslations` spies shared across the test; lets assertions count exact call numbers.
- **`vi.mock` blocks** — stub `vue-router` (fixed `entityType: 'product'`, `id: 'p1'` params), `useSessionStore` (always authenticated with permissions), and the real `../store.ts` Pinia store (returns `capabilities: []`, `fallbackLocale: 'en'`, resolves `fetchLanguages`, and spreads the `store` spies).
- **`TabsStub`** — a no-prop, no-child `defineComponent` used to replace the `TranslationTabs` component so the test focuses on the save/reload flow.
- **`beforeEach`** — resets both spies; `fetchEntityTranslations` resolves a single-row fixture (`fields: ['name']`, one `'en'` translation); `saveEntityTranslations` rejects with `aProblem(412, …)`. Also loads the `'en'` locale for i18n.
- **Single `it` block** ("warns on a 412 and reloads the rows on request, without resending the save") — mounts the component, clicks `[data-test=entity-translations-save]`, then `[data-test=entity-translations-reload-latest]`, and asserts `saveEntityTranslations` was called exactly **1** time while `fetchEntityTranslations` was called exactly **2** times (initial load + reload).

## Relationships

- **`src/modules/locales/views/EntityTranslations.vue`** — the component under test; mounted via `mount()` with Vuetify and i18n plugins. The test interacts with it exclusively through data-test attribute selectors and the mocked store methods.
- **`tests/support/unit/fixtures.ts`** — provides the `aProblem(412, […])` helper used to construct a realistic RFC 7807-style rejection value for the `saveEntityTranslations` mock.

## Notes

- The test relies on `vi.hoisted` for the store spies so the `vi.mock` factory (which runs before imports) can reference them.
- `saveEntityTranslations` is expected to be called **once** total — the initial save attempt. The "reload latest" click must trigger a *fetch*, not a second save; that is the invariant this test guards.
- `fetchEntityTranslations` is expected **twice**: once on initial mount and once after the reload action. Any extra call would signal a spurious re-fetch.
