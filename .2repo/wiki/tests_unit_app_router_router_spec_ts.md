# tests/unit/app/router/router.spec.ts

## Purpose

Verifies that the router is correctly *wired*: that auth enforcement is attached globally and runs in the right order, that locale redirects and 404 catch-alls behave as designed, that the document title and WCAG announcer derive from route `meta`, and that the static prose routes resolve to their computed names. Enforcement itself is mocked — the unit under test is the router's own navigation logic and its route-table declarations, not the guard's decision logic (which lives in `tests/unit/app/guards/authentications.spec.ts`).

## Key elements

- **`loadRouter()`** — Resets the module registry, dynamically imports `@/app/router`, pushes `/`, awaits `isReady()`, and returns the fresh router. Guarantees isolated navigation state per test.
- **`beforeAll` warmup import** — Imports `@/app/router` once outside any test's time budget. Vite's transform cache is *not* cleared by `vi.resetModules()`, so only this first import transpiles the full view graph (Vuetify, etc.). Prevents the first real test from exceeding the 5 s default under `--coverage`.
- **`describe('document title and announcer')`** — Asserts `document.title` and `routeAnnouncement.value` are set from `meta.title`, both translated (platform routes) and untranslated (module routes). Also iterates over shell-owned route names to confirm each declares a title.
- **`describe('locale handling')`** — Confirms bare `/` redirects to a locale-prefixed Home.
- **`describe('unknown routes')`** — Three cases: deep path → locale-scoped 404; single unknown segment → treated as an (unsupported) locale and lands on Home; deep unknown under a known locale → locale-scoped catch-all with `status=404`.
- **`describe('static prose pages')`** — Pins the computed route names (`StaticAbout`, `StaticFaq`, `StaticTerms`, `StaticPrivacy`) so a typo in the name expression is caught.
- **`describe('global auth restore')`** — Asserts `tryRestoreAuth` fires on initial navigation and on every subsequent navigation.
- **`describe('access enforcement')`** — Asserts `enforceRouteAccess` is called on *every* navigation (no opt-out by omission) and that it runs *after* `tryRestoreAuth` settles.
- **`failNavigationWith(error)`** (helper, truncated) — Navigates to Playground, then triggers a guard that throws the given error, and waits for the router to leave the starting route (the `onError` redirect). Starts off Home so a correct 401→Home redirect is distinguishable from a no-op.

## Relationships

No graph neighbors are listed. The file exercises `@/app/router` (the router instance), `@/app/guards/authentications.ts` (mocked), `@/infrastructure/observability/store.ts` (mocked), `@/app/router/announcer.ts`, and `@/app/router/navigation.ts` (for `signInLocation`).

## Notes

- **Coverage timing trap.** The `beforeAll` warmup is not cosmetic: without it, the first test under `--coverage` can exceed the 5 s default because Vite's one-off transpile cost lands inside that test's budget. Removing or shortening the 60 s `beforeAll` timeout is likely to re-introduce a flaky coverage failure.
- **Single-segment locale quirk.** `/:locale` matches exactly one path segment, so a bare `/nonsense` is read as locale `nonsense` (rewritten to the default) rather than as an unknown path. The top-level `/:catchAll(.*)` route is therefore unreachable for any real path; the test that documents this is intentionally kept as a guard against a future route-table change that would make it reachable.
- **Per-route access declarations live elsewhere.** The old table of domain paths asserting each route's `meta.access` was moved to `src/modules/<name>/tests/routes.spec.ts`. What remains here is the shell-level contract: enforcement is attached and correctly ordered.
- **`loadRouter` uses `vi.resetModules()` + dynamic `import`.** This means the router module graph is re-instantiated per test, but the expensive Vite transform is cached after the `beforeAll` warmup. Do not replace this with a static import or a single shared router instance without re-evaluating the isolation guarantees.
