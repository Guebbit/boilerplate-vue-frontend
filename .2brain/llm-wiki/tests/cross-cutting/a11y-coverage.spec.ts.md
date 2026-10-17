---
source: tests/cross-cutting/a11y-coverage.spec.ts
sha256: 6f049ebd141caa9eaae84f77ecba16869869c0a30cac5a8faa78e61e7c019a44
generated_at: 2026-10-17T01:59:26.445728+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/a11y-coverage.spec.ts

## Purpose

A Vitest spec that enforces a11y coverage structurally: it reads every module's `routes.ts` and its co-located `a11y.cy.ts` sweep, then asserts that every declared route is visited by the sweep (and vice-versa). It does **not** run axe or open a browser — it catches the absence of a sweep, which no in-Cypress assertion could report because a missing spec simply never runs.

## Key elements

- **`EXEMPT`** – `Set<string>` of route paths that are redirects or containers (e.g. `logout`, `/:locale`, catch-alls, `/oauth/callback`). Adding an entry is an explicit decision to leave a route unaudited; each entry carries a reason comment.
- **`routePathsIn(source)`** – Extracts every `path: '…'` literal from a route-file's source. Also handles the shell's mapped-page pattern (`(['about', 'faq', …] as const).map`) that the plain regex would miss.
- **`LOCALE_PREFIX`** – Regex alternation built at runtime from `@/i8n`'s `supportedLanguages`, so adding/removing a locale updates the scan automatically.
- **`sweptPathsIn(source)`** – Extracts locale-prefixed URL strings from a sweep file, stripping the locale segment, query strings, and hashes to yield bare paths.
- **`routeMatcher(route)`** – Converts a vue-router `path:` (with `:param`, `:param?`, `(.*)`) into a `RegExp` that can be tested against a swept path.
- **`RoutedUnit`** – Interface bundling a unit's name, declared routes, swept paths, and whether a sweep file exists.
- **`moduleUnit(name)` / `routedModules` / `shell`** – Build `RoutedUnit` objects for every module directory under `src/modules` that has a `routes.ts`, plus the app shell from `src/app/router/index.ts` and `tests/e2e/specs/a11y.cy.ts`.
- **`unsweptRoutes(unit)`** – Returns routes in a unit (minus `EXEMPT`) that no swept path matches.
- **`describe('accessibility coverage')`** – Six assertions:
  1. The parser actually sees routes (non-vacuity guard).
  2. Every routed module has an `a11y.cy.ts`.
  3. Every module route is swept.
  4. Every shell route is swept.
  5. No sweep visits a path no route serves (dead-path guard, modules only).
  6. No orphaned sweep remains after a module drops its `routes.ts`.

## Relationships

- **`tests/unit/app/guards/authentications.spec.ts`** – Shares the `@/i18n` (`supportedLanguages`) dependency; no direct import or runtime coupling between the two specs.

## Notes

- **Structural, not behavioral.** This file reads source text with regexes. If routes are respelled (template literals, computed paths, moved to a different file), the regex silently stops matching them and the spec passes over an empty set. The "not vacuous" test is the only guard against that.
- **`routePathsIn` has a second regex** for the shell's `.map((page) => …)` pattern. Any new route-declaration idiom in a route file must be handled here or the route is invisible.
- **`EXEMPT` is an allow-list, not a deny-list.** Every route not in this set *must* be swept. Adding to `EXEMPT` is a policy decision that should be reviewed with the reason comment.
- **Modules without `routes.ts`** (e.g. `delivery`, `payments`) are exempt by design — they render no standalone page. The last test prevents the reverse orphan (a sweep with no routes).
- **Locale coupling.** `LOCALE_PREFIX` is derived from `supportedLanguages`; an empty array would produce a regex that matches *any* leading slash, making every path look "swept." The non-vacuity test asserts `supportedLanguages.length > 0` to catch that.
