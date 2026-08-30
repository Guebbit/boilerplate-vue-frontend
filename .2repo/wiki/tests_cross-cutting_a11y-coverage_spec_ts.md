# tests/cross-cutting/a11y-coverage.spec.ts

## Purpose

A Vitest spec that performs a **structural** (source-reading) check: every route declared in a module's `routes.ts` (or the shell router) must be visited by that module's `a11y.cy.ts` sweep, and vice-versa. It does not run axe or open a browser; it catches the absence of a sweep that a runtime tool would never report because a missing spec produces no assertions. A new page without a sweep cannot be merged.

## Key elements

- **`EXEMPT`** — `Set<string>` of route paths that are redirects or containers (`logout`, `/`, `/:locale`, catch-alls) and are intentionally not swept.
- **`routePathsIn(source)`** — Extracts all `path: '…'` literals from a route-file source string; also handles the shell's `.map((page) => …)` pattern.
- **`sweptPathsIn(source)`** — Extracts locale-prefixed URLs visited by a sweep, stripping the locale prefix and query/hash.
- **`routeMatcher(route)`** — Converts a vue-router path (with `:param`, `:param?`, `(.*)`) into a `RegExp` that tests whether a swept path would hit that route.
- **`RoutedUnit`** / **`moduleUnit(name)`** — Bundles a module's routes, swept paths, and whether a sweep file exists into one record.
- **`routedModules`** — All modules under `src/modules/` that have a `routes.ts`.
- **`shell`** — The `RoutedUnit` for `src/app/router/index.ts` vs. `tests/e2e/specs/a11y.cy.ts`.
- **`unsweptRoutes(unit)`** — Returns routes in a unit that no swept path matches (exemptions excluded).
- **Six `it` blocks** — (1) guard against vacuous parsing, (2) every routed module has a sweep file, (3) every module route is swept, (4) every shell route is swept, (5) no sweep visits a path no route serves (dead-path check, shell excluded), (6) no orphaned `a11y.cy.ts` lingers in a module that no longer has `routes.ts`.

## Relationships

- **`src/app/router/index.ts`** — Read at runtime via `readFileSync`; its route declarations are parsed and matched against the shell sweep (`tests/e2e/specs/a11y.cy.ts`). This is the only shell-level unit the spec checks.

## Notes

- The spec is intentionally **not** an axe run. It catches *missing* sweeps, which a browser-based audit cannot detect (a non-existent spec produces no failure).
- Route-param matching is approximate: `:id` matches any single segment, `:id?` matches zero or one, `(.*)` matches the remainder. It does not validate that the sweep actually supplies a meaningful value.
- The shell's prose pages (`about`, `faq`, etc.) are declared via `.map()` over a string array rather than as individual `path:` literals; `routePathsIn` has a second regex to catch that pattern. Adding a new page to that array is a new route that must be swept.
- The "dead path" check (sweep visits a path no route serves) **excludes the shell** because the shell's catch-all makes every path technically served.
- Modules without a `routes.ts` (e.g. `delivery`, `payments`) are exempt from the sweep requirement — they render no page of their own.
