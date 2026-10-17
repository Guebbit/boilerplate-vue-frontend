---
source: tests/unit/app/health-banner.spec.ts
sha256: aeb900c4483cfbebbb052ace4eba3539ee326ca68a0373db4414c4a61b7ae97d
generated_at: 2026-10-17T02:31:04.071643+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/health-banner.spec.ts

## Purpose

Unit-test suite for `AppHealthBanner.vue` that verifies the component's reactive wiring to the `useLivenessProbe` hook: the banner is hidden while the API is healthy, appears when the probe reports a outage, and disappears again on recovery. The liveness probe is mocked so the tests exercise only the component's `down → banner` contract, not the toolkit's internal retry logic.

## Key elements

- **`down` (module-level `ref`)** — shared reactive flag that the mocked `useLivenessProbe` returns; flipped between tests to simulate API up/down transitions.
- **`vi.mock('@guebbit/vue-toolkit')`** — replaces `useLivenessProbe` with a stub that always returns the current `down` ref plus no-op `check`/`stop`.
- **`vi.mock('vue-i18n')`** — preserves the real module but overrides `useI18n` so `t(key)` returns the key string verbatim, letting assertions match raw i18n keys (e.g. `'generic.api-unreachable'`).
- **`AppHealthBannerInLayout`** — a thin `defineComponent` wrapper that places `AppHealthBanner` inside a `VApp` element; required because `VSystemBar` (used internally by the banner) throws without an ancestor layout container, and the app's per-SFC auto-import means `<v-app>` is not globally resolvable in this inline template.
- **`mountBanner()`** — mounts the wrapper with the shared `vuetify` plugin instance from `@/ui/vuetify`.
- **Four `it` blocks** — assert: no banner element when `down` is false; banner present and containing the i18n key when `down` is true; banner removed after `down` flips back to false; and the `[role="status"]` live region remains mounted regardless of state.

## Relationships

No graph neighbors are tracked for this file. Its direct imports are the component under test (`@/app/components/AppHealthBanner.vue`), the Vuetify app instance (`@/ui/vuetify`), and two modules that are fully mocked (`@guebbit/vue-toolkit`, `vue-i18n`).

## Notes

- The `down` ref is declared once at module scope and mutated in place across tests; there is no per-test reset. Test order is therefore significant — each test sets `down.value` before mounting.
- The third test wraps assertions in `Promise.resolve().then(…)` plus `$nextTick` to ensure Vue flushes the removal before the DOM assertion runs.
- The live-region test encodes an accessibility invariant: the `role="status"` / `aria-live="polite"` element must persist so that screen readers announce the *content* change, rather than the region itself being created and destroyed.
- Because `vite-plugin-vuetify` handles component registration per SFC in the app, the test must import and register `VApp` explicitly; writing `<v-app>` as a bare tag in the inline template would fail.
