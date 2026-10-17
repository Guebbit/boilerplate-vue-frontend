---
source: tests/unit/app/router/router.spec.ts
sha256: 0a90041f1fb7bd1b5a954d7cfdcd0007c99490ffb903aabbaef8737c9a926d4a
generated_at: 2026-10-17T02:32:36.916674+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/router/router.spec.ts

## Purpose

Verifies the router's *wiring* rather than its policy: that the auth-restore and access-enforcement hooks are actually attached, that every route declares the metadata it should (title, locale), that the locale redirect and 404 catch-alls behave as documented, and that the static-page route names are correct. The enforcement logic itself is proven in `tests/unit/app/guards/authentications.spec.ts`; here it is mocked so the test isolates the router's own navigation behaviour.

## Key elements

- **`tryRestoreAuth`** – `vi.fn` stub for the session-restore call the router's guard awaits.
- **`enforceRouteAccess`** – Deliberately untyped `vi.fn` (the real function is 2-arg; the mock is called with one) so `mockImplementationOnce` works without a TS error.
- **`loadRouter()`** – Resets the module registry via `vi.resetModules()`, re-imports `@/app/router`, performs an initial `push('/')`, and awaits `isReady()`. Yields a fresh router per test (router holds navigation state; `history` is global).
- **`beforeAll` warmup** – Imports `@/app/router` once outside any test budget so the expensive Vuetify/view transpile cost is not charged to the first test (which would exceed the 5 s default under `--coverage`).
- **`describe('document title and announcer')`** – Asserts `document.title` and `routeAnnouncement` are set from `meta.title`, that the app name reads from `VITE_APP_NAME`, that an aborted navigation leaves both untouched, and that every shell route declares a title.
- **`describe('locale handling')`** – Bare `/` redirects to the locale-prefixed Home route.
- **`describe('unknown routes')`** – 404 catch-all preserves locale; locale-less real paths (`/products`, `/faq`) resolve to their routes; a single unknown segment is interpreted as a locale (lands on Home); a deep unknown path hits the *locale-scoped* catch-all.
- **`describe('static prose pages')`** – Pins the computed route names (`StaticAbout`, `StaticFaq`, `StaticTerms`, `StaticPrivacy`) against typos in the `'Static' + …` expression.
- **`describe('global auth restore')`** – `tryRestoreAuth` fires on initial and on every subsequent navigation.
- **`describe('access enforcement')`** – `enforceRouteAccess` is called on every navigation (public routes included) and only after the auth restore settles.

## Relationships

No graph neighbors are listed. The file exercises the default export of `@/app/router`, imports `signInLocation` from `@/app/router/navigation.ts` and `routeAnnouncement` from `@/app/router/announcer.ts`, and mocks `@/app/guards/authentications.ts` and `@/infrastructure/observability/store.ts`. It is the companion to `tests/unit/app/guards/authentications.spec.ts` (policy) rather than a duplicate of it.

## Notes

- `vi.resetModules()` clears the Vite module registry but **not** the transform cache; only the first import in the file actually transpiles, which is why the `beforeAll` warmup only needs to run once.
- The top-level `/:catchAll(.*)` route is effectively unreachable as long as `/:locale` remains a single-segment param. The deep-unknown-path test is kept specifically as a guard: it would fail if someone changed `/:locale` to a greedy pattern, making the top-level catch-all reachable and altering 404 behaviour.
- A single unknown path segment (e.g. `/nonsense`) is *not* a 404 — it is read as an unsupported locale and rewritten to the default, landing on Home. This is a documented routing decision, not a bug.
- The `enforceRouteAccess` mock carries an `eslint-disable` for `@typescript-eslint/no-unsafe-return`; this is intentional and load-bearing for the one-argument `mockImplementationOnce` calls.
- Tests are async-returning (`.then` chains) rather than `async/await` to keep the per-test timeout budget tight under coverage instrumentation.
