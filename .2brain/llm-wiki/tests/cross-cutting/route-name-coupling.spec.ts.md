---
source: tests/cross-cutting/route-name-coupling.spec.ts
sha256: 77240ecd2520390f7a4060e43981348963438401f3c80508fe0f12e8d2fd1134
generated_at: 2026-10-17T02:02:21.127643+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/route-name-coupling.spec.ts

## Purpose

Detects cross-module route-name references (e.g. `router.push({ name: 'SiblingRoute' })`) that lack both a `MODULE_EDGES` coupling and a runtime guard (`hasRoute` / `linkIfRouted`). Because route names are plain strings invisible to import-based boundary rules, this spec scans **source text** to catch the coupling that `eslint.config.ts` cannot see, preventing a deleted module from causing a runtime `vue-router` throw.

## Key elements

- **`routeNamesOf(routes)`** – Recursively flattens a `RouteRecordRaw[]` tree into the set of declared route names (including children).
- **`SHELL_ROUTE_NAMES`** – Route names owned by the app shell (`Home`, `Error`, plus names derived from `STATIC_PAGES`).
- **`ownRouteNames`** – `Map<moduleName, Set<routeName>>`; the route names each enabled module declares in its own `routes` array.
- **`everyRouteName`** – `Set` of every route name in the build (shell + all modules). Used as the intersection filter so unrelated quoted strings (CSS classes, i18n keys) are never flagged.
- **`allowedRouteNamesOf(moduleName)`** – Returns the set of route names a module may reference *without* a guard: its own names, shell names, and names of `MODULE_EDGES` siblings.
- **`listFiles(directory)`** – `globSync` for `**/*.{ts,vue}`, excluding paths containing `/tests/`.
- **`isGuarded(source, name)`** – Text-level regex check: true if `hasRoute('Name')` or `linkIfRouted(…'Name'…)` appears anywhere in the file.
- **`routeNameReferencesIn(source)`** – Extracts all single/double-quoted PascalCase-ish literals from a file, filtered to `everyRouteName`, deduplicated. Backtick-quoted text is deliberately excluded.
- **Three `it` blocks** – Two canaries (module list non-empty; at least one cross-module reference exists so the sweep isn't vacuous) and the actual violation assertion.

## Relationships

- **`scripts/module-edges.ts`** – Imports `MODULE_EDGES` to determine which sibling modules a given module is *declared* to reach. A reference to a sibling's route name is only exempt when that sibling appears in `MODULE_EDGES[moduleName]`.
- **`@/modules`** – Imports `enabledModules` to enumerate the active modules and their route declarations.
- **`@/app/utils/static-pages.ts`** – Imports `STATIC_PAGES` and `staticPageRouteName` to build the shell route-name set.

## Notes

- **Text-level, not AST-level.** `isGuarded` and `routeNameReferencesIn` are regex-based. A guard is recognised if the *same literal* appears inside a `hasRoute(…)` or `linkIfRouted(…)` call in the same file; the call is not evaluated.
- **Permissive by construction.** A quoted string is only checked if it intersects `everyRouteName`. This keeps false positives (translation keys, CSS class names, component `name:` props) out of scope.
- **Backtick exclusion is intentional.** In this codebase, backtick-wrapped text in comments is prose about route names, not a real navigation target.
- **Canary tests are load-bearing.** If the regex, glob, or route-name set silently breaks, the main assertion would pass vacuously; the two "finds at least something" tests guard against that.
- **Does not import or interact with `tests/unit/scripts/pairing/paired-backend-path.spec.ts`** despite sharing a graph neighborhood.
