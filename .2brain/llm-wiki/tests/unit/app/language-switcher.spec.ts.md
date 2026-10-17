---
source: tests/unit/app/language-switcher.spec.ts
sha256: 0075c835ddce22f6ca842e9eaabc99ecf13d8ad0c637c2fbcab90764236769fb
generated_at: 2026-10-17T02:31:31.305563+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/language-switcher.spec.ts

## Purpose

Dedicated unit test for the `AppLanguageSwitcher` component, verifying its contract in isolation (menu rendering, active-locale marking, locale-prefixed route re-entry, fallback navigation, and trigger-button labeling). It exists to test the component on its own rather than relying on the indirect coverage obtained by mounting it as a child inside `app-navigation.spec.ts`.

## Key elements

- **`mountSwitcher()`** — Local helper that mounts `AppLanguageSwitcher` with the Vuetify plugin and a `VMenu` stub that renders both the activator slot and default slot inline, bypassing v-menu's teleport/lazy-render behavior so assertions can run without opening a real menu.
- **`replace` / `push`** — `vi.fn()` mocks for `useRouter()` navigation methods; `replace` is the primary path, `push` is the fallback target.
- **`currentRoute`** — Fixed mock for `useRoute()` carrying `params: { id: '42' }` and `query: { tab: 'details' }` so tests can assert the switcher preserves them.
- **`persistLocalePreference`** — Mock for the session store method the component calls to record the user's locale choice.
- **`vi.mock('vue-router')`, `vi.mock('@/infrastructure/session.ts')`, `vi.mock('vue-i18n')`** — Module-level mocks. The i18n mock spreads the real module and overrides `useI18n` to return identity `t`, `te: () => false`, and `locale: ref('en')`.
- **`describe('AppLanguageSwitcher')`** block with five tests:
  - One menu option per supported language (EN, IT) inside a `role="menu"` container.
  - Active locale's option carries `aria-current="true"`; the other does not.
  - Clicking a non-active option calls `persistLocalePreference` with the new code and calls `router.replace` with the locale injected into params while preserving the original `id` param and `tab` query.
  - If `replace` rejects, the component falls back to `router.push('/')`.
  - The trigger button's visible text contains the language name and its `aria-label` is `navigation.label-language: EN`.

## Relationships

No graph-neighbor files are listed for this file. The component under test is `@/app/components/AppLanguageSwitcher.vue`; the test also imports `@/ui/vuetify` for the plugin and references `@/infrastructure/session.ts` via a mock.

## Notes

- The `VMenu` stub is the same pattern used in `app-navigation.spec.ts`; without it, v-menu teleports its content and renders lazily, so the language options would not be present in the wrapper DOM.
- The i18n mock preserves all other named exports from the real `vue-i18n` module (via `importOriginal` spread), so any transitive import that expects `createI18n`, `I18n`, etc. still resolves.
- The fallback test uses `vi.waitFor` to handle the async chain of `trigger('click')` → rejected `replace` → `push('/')`, rather than a simple `await` on the click promise.
