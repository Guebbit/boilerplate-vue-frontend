---
source: tests/cross-cutting/a11y-coverage.spec.ts
sha256: 04e7aad8e4ae287c3ed515907cd42ea4a0393d12dbde5283402cc04dff5d0a24
signature: 5a754c52bca104e3070794542e7e0e5695c574a10aa8577c78a32434b2fb4705
generated_at: 2026-11-10T06:35:01.070964+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/a11y-coverage.spec.ts

## Purpose

A structural (static-analysis) test that guarantees every route declared by a module's `routes.ts` — and every route in the shell router — is visited by a corresponding a11y sweep. It does not run axe or a browser; it reads source files with regex and asserts that no route is left unvisited. It exists because a missing sweep file produces zero failing assertions, so without this meta-check a deleted or never-written sweep would pass silently.

## Key elements

- **`EXEMPT`** — `Set<string>` of route paths (redirects, containers, locale shims) that are deliberately not swept. Each entry carries a comment explaining why.
- **`routePathsIn(source)`** — Extracts every `path: '...'` literal from a route file, plus pages declared via a `.map((page) => …)` pattern over an `as const` array (used by the shell's prose pages).
- **`sweptPathsIn(source)`** — Extracts every locale-prefixed quoted path from a sweep file, stripping the locale segment and any query/hash fragment.
- **`LOCALE_PREFIX`** — Regex alternation built at runtime from `@/i18n`'s `supportedLanguages`, so adding a language automatically updates what is scanned.
- **`routeMatcher(route)`** — Converts a vue-router path (`:id`, `:message?`, `(.*)`) into a `RegExp` that can be tested against a swept path.
- **`RoutedUnit`** / **`moduleUnit(name)`** / **`routedModules`** / **`shell`** — Model each unit of routable code (module or shell) with its declared routes, the paths its sweep visits, and whether a sweep file exists.
- **`unsweptRoutes(unit)`** — Returns `[module: path, …]` for every non-exempt route no swept path matches.
- **`describe('accessibility coverage')`** — Six assertions:
  1. *Not vacuous* — the parser actually found routes and `supportedLanguages` is non-empty.
  2. *Every routed module has an a11y sweep file.*
  3. *Every module route is visited by its sweep.*
  4. *Every shell route is visited by the shell sweep.*
  5. *No swept path is dead* (reverse direction: a sweep shouldn't visit a path no route serves; shell excluded because its catch-all matches everything).
  6. *No orphaned sweep* (a module with no `routes.ts` should not retain an `a11y.cy.ts`).

## Relationships

No direct import or runtime interaction with `tests/unit/app/guards/authentications.spec.ts` is visible in this file. The two files share the broader concern of route-level test coverage but do not reference each other.

## Notes

- **Static analysis, not E2E.** The test reads `.ts` source with regex. It will break silently if route declarations change syntax (e.g., double quotes, template literals, dynamic `path` values) — the "is not vacuous" guard catches the most obvious regressions (empty parse results), but not all.
- **`EXEMPT` is a policy list.** Adding a route here is an explicit decision to skip a11y auditing for that path; a reason comment is mandatory by convention.
- **Layout coverage rides along.** Because layout sweeps run inside the same `a11y.cy.ts` files, a route with no a11y sweep also has no layout check at any viewport.
- **`supportedLanguages` dependency.** `LOCALE_PREFIX` is derived from `@/i18n`; if that export is empty, the regex alternation degenerates to matching any leading slash (the vacuousness guard asserts this cannot happen).
- **File-level vs route-level.** The test intentionally checks route-by-route, not merely "does `a11y.cy.ts` exist," because one sweep file can cover multiple routes (e.g., list + detail + edit) and a file-existence check would miss gaps within it.
