---
source: tests/unit/app/layout-default.spec.ts
sha256: cc9383efe08d4d74a8fd81319031d142d7d7e19a9491295008154fdd9033395e
generated_at: 2026-10-17T02:31:43.844893+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/layout-default.spec.ts

## Purpose

Unit test for `LayoutDefault.vue`, the single app-shell layout the router mounts for every route. It verifies only the shell's own responsibilities—hero title rendering (including opt-out and centering), `RouterView` passthrough, session-expiry re-entry, and the privacy-choices link—while all chrome sub-components are stubbed out, since they are covered by their own specs.

## Key elements

- **`CHROME_STUBS`** — Object listing six chrome components (`AppNavigation`, `AppHealthBanner`, `AppVerificationBanner`, `AppAnalyticsConsentBanner`, `DialogHost`, `ReauthDialog`) set to `true` so Vue Test Utils replaces them with no-op stubs.
- **`router`** — A `createMemoryHistory` router declaring three test routes (`/plain`, `/custom`, `/no-title`) plus `STATIC_PAGES` routes (needed so footer `RouterLink`s resolve). Route `meta` fields (`title`, `customHero`, `centered`) drive the hero behavior under test.
- **`mountLayout()`** — Helper that mounts `LayoutDefault` with real `vuetify`, `i18n`, and the test `router`, applying `CHROME_STUBS`.
- **`describe('LayoutDefault — the hero')`** — Three cases: translated title on a plain route; no `<h1>` when `customHero` is set; no `<h1>` when the route has no title.
- **`describe('LayoutDefault — the matched view')`** — Verifies the matched leaf component renders through `RouterView`, and that `min-h-[60vh]` centering appears only when the route's `meta.centered` is true.
- **`describe('LayoutDefault — a session that died on its own')`** — Bumps `useSessionStore().expiredSignal` to simulate a passive expiry and asserts a notification plus `router.replace` with `force: true`; confirms `clearSession()` (explicit logout) triggers neither.
- **`describe('LayoutDefault — the privacy choices link')`** — Stubs `VITE_UMAMI_*` / `VITE_FARO_URL` env vars to test link absence when unconfigured, and click-to-reopen of `useAnalyticsConsentStore().promptOpen`.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The file never imports or exercises the real app router; all route resolution happens through the local memory-history router.
- `STATIC_PAGES` routes exist in the test router solely so `RouterLink` instances in `LayoutDefault`'s footer can resolve; they are not the subject of any assertion.
- The session-expiry test relies on mutating `expiredSignal` (a plain numeric counter) and then awaiting `flushPromises()`—there is no timer or async event to wait for.
- The privacy-choices test calls `vi.unstubAllEnvs()` in `afterEach`, so env stubs never leak between cases.
