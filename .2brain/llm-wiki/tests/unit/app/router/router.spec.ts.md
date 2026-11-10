---
source: tests/unit/app/router/router.spec.ts
sha256: 0d6dd051f6d5b426a7f4d5e27a784f3f47dbe0da276fc8fc91d58993b7485649
signature: c83d0f1daf1cf7e316e3e3aec80d4dc2e70dd22f97697fd85fb0fc76d9bc8122
generated_at: 2026-11-10T07:50:03.177426+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/router/router.spec.ts

## Purpose

Unit tests for the app-level router (`@/app/router`). Verifies the router's own wiring—locale redirect, 404 catch-alls, document-title/announcer side-effects, robots-meta injection, and static-page route naming—while deliberately mocking out the auth enforcement so that a dropped `meta.access` declaration is caught here rather than in the guard's own spec.

## Key elements

- **`loadRouter`** — Resets the module registry, dynamically imports `@/app/router`, pushes `/`, and awaits `isReady()`. Returns a fresh router instance per test.
- **`enforceRouteAccess` / `tryRestoreAuth`** — `vi.fn()` stubs that replace the real guard implementations via `vi.mock('@/app/guards/authentications.ts', …)`. They let the test assert *declarations* on route records without re-implementing the access decision logic.
- **`beforeAll` (60 s budget)** — Pre-imports `@/app/router` outside any single test's time budget. Prevents a one-off Vite transpile cost from tripping the 5 s default under `--coverage`.
- **`describe('document title and announcer')`** — Asserts `document.title` and `routeAnnouncement.value` are set from `meta.title`, follow the route, respect `VITE_APP_NAME`, and are left untouched on aborted navigations.
- **`describe('robots meta')`** — Asserts the `<meta name="robots">` tag is set to `noindex` on `meta.access` routes and the error page, absent on public routes, removed on return to public, and never duplicated.
- **`describe('locale handling')`** — Confirms bare `/` redirects to a locale-prefixed `Home`.
- **`describe('unknown routes')`** — Pins the 404 catch-all behaviour, locale-less path preservation, and the (intentional) quirk that a single unknown segment is interpreted as a locale and lands on Home.
- **`describe('static pages')`** (truncated) — Verifies the computed route-name formula (`'Static' + …`) and per-page meta.

## Relationships

No graph neighbors are registered for this file. It imports the router under test and the announcer helper, and mocks the authentication-guard module and the observability store, but none of those files are tracked as graph neighbors in this index.

## Notes

- **Coverage-timeout workaround.** The `beforeAll` warm import exists because the router pulls in every view (and Vuetify). Without it, the first test pays the full transpile cost and can exceed the 5 s limit *only* under `--coverage`. Remove it if the import graph shrinks.
- **`enforceRouteAccess` is intentionally untyped.** The real signature takes two arguments; the suite calls it with one. The `vi.fn()` is left bare (with an eslint-disable) to avoid a type error at the mock boundary.
- **"Unreachable" top-level catch-all.** The test that `/a/b/c` hits the *locale*-scoped 404 (not the top-level `/:catchAll(.*)`) is kept as a guard on the route table: if `/:locale` ever becomes multi-segment, that test fails and the claim is invalidated.
- **Static-route names are computed, not literal.** An off-by-one in the naming expression silently produces wrong route names; the suite asserts the exact strings to pin the formula.
