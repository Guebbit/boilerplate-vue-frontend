# tests/cross-cutting/a11y-coverage.spec.ts

## Purpose

A structural guard that asserts, without launching a browser, that every route the app declares has a corresponding path visited by its accessibility sweep (`a11y.cy.ts`). It exists because the sweeps live inside each domain module (so a deleted module's coverage disappears with it), and there is no single human-maintained list of "what is covered." This spec turns that absence into a failing assertion: a new page with no sweep cannot merge.

## Key elements

- **`EXEMPT`** — A `Set<string>` of route paths (redirects, containers, shims) that no sweep can or should visit. Each entry carries an inline comment justifying its exclusion.
- **`routePathsIn(source)`** — Extracts every `path: '…'` literal from a route file's source text. Also detects the shell's mapped prose pages (`['about','faq',…].map((page) → …)`) that a simple regex would miss.
- **`sweptPathsIn(source)`** — Extracts locale-prefixed URLs (`/en/…`, `/it/…`) from a sweep file, stripping the locale prefix and any query/hash fragment.
- **`routeMatcher(route)`** — Compiles a vue-router path template (e.g. `products/:id/edit`) into a `RegExp` that matches concrete swept paths, handling `:param`, optional `:param?`, and `(.*)` patterns.
- **`RoutedUnit`** — Interface bundling a unit's name, its declared routes, its swept paths, and whether a sweep file exists.
- **`moduleUnit(name)` / `routedModules` / `shell`** — Build `RoutedUnit` objects for each domain module under `src/modules/*` and for the app shell (`src/app/router/index.ts` vs `tests/e2e/specs/a11y.cy.ts`).
- **`unsweptRoutes(unit)`** — Returns the list of non-exempt routes in a unit that no swept path matches.
- **Six `it` blocks** inside `describe('accessibility coverage', …)`:
  1. Non-vacuity check (modules and routes are actually parsed).
  2. Every routed module has an `a11y.cy.ts`.
  3. Every declared route is reached by some swept path.
  4. Same for the shell router.
  5. No swept path is "dead" (references a route that no longer exists).
  6. No orphaned `a11y.cy.ts` lingers after a module drops its `routes.ts`.

## Relationships

- **`tests/unit/app/guards/authentications.spec.ts`** — No code-level dependency. The connection is thematic: the `EXEMPT` set carves out `logout` and `/oauth/callback`, which are the very routes whose guard behavior the authentications spec exercises. A change to how those redirects work could affect whether this spec's exemption list stays correct.

## Notes

- This is a **source-text parser, not a runtime check.** It reads `.ts` files with regexes; it does not import or execute them. A refactor that changes how routes are declared (e.g. moving to a config object or a different quote style) will silently break the extraction and the "non-vacuous" test is the safety net for that.
- The shell's prose pages are declared via a `.map()` over a const array rather than as individual `path:` literals. `routePathsIn` has a special second regex to pull those out. If the declaration pattern changes, this spec will under-count shell routes.
- `EXEMPT` is intentionally small and opinionated. Adding an entry is a deliberate decision to leave a route unaudited and requires a comment explaining why.
- The reverse-direction check (test 5) intentionally **excludes the shell**, because the shell's catch-all route makes every arbitrary path a "served" one.
