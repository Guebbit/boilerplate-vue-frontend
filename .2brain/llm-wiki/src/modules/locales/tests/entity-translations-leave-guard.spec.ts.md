---
source: src/modules/locales/tests/entity-translations-leave-guard.spec.ts
sha256: 62b1a4bef34582760094e8c04a2780ddb3a4ca40b8781237aee142a9b62e85cd
signature: 513fcbb95a29a35b7244feb02b7edb514aafe8f801758ae5eed312f9e67a664b
generated_at: 2026-11-10T04:43:32.788984+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/tests/entity-translations-leave-guard.spec.ts

## Purpose

Vitest spec that verifies the `isDirty` ref handed to `useLeaveGuard` by the EntityTranslations screen transitions correctly through the expected states: clean after a load, dirty after a field edit or a tab is opened, dirty when a saved tab is marked for removal, and clean again once the value is restored or the transient tab is closed.

## Key elements

- **`guard`** (hoisted mock object) — captures the `isDirty` `Ref<boolean>` the screen passes into `useLeaveGuard`, so tests can read its `.value` directly.
- **`vi.mock('@/ui/composables/use-leave-guard.ts')`** — replaces the real composable with one that records the ref and returns a no-op `markSaved`.
- **`vi.mock('vue-router')`** — pins `useRoute` to a fixed `product/p1` route.
- **`vi.mock('../store.ts')`** — provides a single-field (`name`), single-locale (`en`) translation payload for `fetchEntityTranslations`.
- **`mountScreen()`** — mounts `EntityTranslations` with Vuetify, i18n, and `TranslationTabs` stubbed to `TabsStub`.
- **`TabsStub`** — a minimal component rendering three buttons (`add-es`, `remove-es`, `remove-en`) that emit the `add`/`remove` events the real tab bar would dispatch.
- **`describe('EntityTranslations leave guard')`** — four cases:
  - clean right after load
  - dirty after edit → clean after restoring the original value
  - dirty after opening a new tab → clean after removing that tab
  - dirty after marking a saved tab (`en`) for removal

## Relationships

- **`src/modules/locales/views/EntityTranslations.vue`** — the component under test; mounted and interacted with through the wrapper. Its `useLeaveGuard` call is the sole subject of every assertion.

## Notes

- The guard ref is obtained via `vi.hoisted` so the mock factory can reference it without triggering a hoisting error.
- `TranslationTabs` is stubbed to raw `<button>` elements; the test exercises only the `add`/`remove` event contract, not tab UI logic.
- The store mock always resolves a single `name` field with the value `"Shoe"` in `en`, so the "restore" assertion in the edit test is deterministic.
- `flushPromises` is awaited after every mount and after each interaction before asserting on `guard.isDirty?.value`, because the screen sets the ref asynchronously inside a `watchEffect`/`onMounted` cycle.
