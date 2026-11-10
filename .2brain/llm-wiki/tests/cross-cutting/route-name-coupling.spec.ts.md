---
source: tests/cross-cutting/route-name-coupling.spec.ts
sha256: 7413e7887330c738df60f3a66a6a35d254ab6cdd0fbf4181a95ddab114c4205a
signature: ffaf58d9fd051bc43126f2e06b5c8ba1cb7861d6f89515922aad9ba0d3063311
generated_at: 2026-11-10T06:40:43.269821+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/route-name-coupling.spec.ts

## Purpose

Detects unguarded cross-module route-name string references (e.g. `router.push({ name: 'OrderTarget' })`) that ESLint boundary rules cannot see because they are plain literals. By reading source text of every enabled module, it ensures any route name a module references either belongs to that module, the app shell, a declared `dependsOn` sibling, or is protected by a `hasRoute` / `linkIfRouted` guard.

## Key elements

- **`routeNamesOf`** — Recursively extracts all route `name` strings from a `RouteRecordRaw` tree at any depth.
- **`SHELL_ROUTE_NAMES`** — Hard-coded list of the app shell's route names plus those derived from `STATIC_PAGES`.
- **`ownRouteNames`** — `Map<moduleName, Set<string>>` of each enabled module's declared route names.
- **`everyRouteName`** — Union of all route names in the build; used as a filter so unrelated quoted strings are never flagged.
- **`allowedRouteNamesOf(moduleName)`** — Returns the set of route names a module may reference freely (its own + shell's + `dependsOn` siblings').
- **`isGuarded(source, name)`** — Regex check for `hasRoute('name')` or `linkIfRouted(..., 'name')` in the file text.
- **`declaresNotices(source)` / `sweptText(source)`** — Detects files importing `AppNotice`/`NoticeTarget` from the kernel registry and strips `route: 'Name'` patterns from them before sweeping (those are guarded by construction).
- **`routeNameReferencesIn(source)`** — Extracts all single/double-quoted literals that intersect with `everyRouteName`, deduplicated.
- **`unguardedIn(source, allowed)`** — Returns referenced route names that are neither in `allowed` nor guarded.
- **`describe` block 1** — Three tests: canary (modules exist), canary (at least one cross-module reference found), and the main assertion (zero unguarded references).
- **`describe` block 2** — Unit-level checks confirming the notice-exemption logic: `route:` is ignored in notice files but `name:` is still flagged.

## Relationships

- **`scripts/module-manifest.ts`** — Imports `moduleDependsOn`, the declared coupling map that determines which sibling routes a module is permitted to reference without a guard.

## Notes

- This test reads **source text**, not a mounted app or router instance — the failure mode is a string literal that no compiler or lint rule can resolve.
- Backtick-quoted text is deliberately excluded from the reference sweep; the codebase convention uses backticks for *prose* mentions of route names in comments.
- The reference-extraction regex is intentionally broad (any `['"]word['"]`), not narrowed to `name: 'X'`, because `linkIfRouted` callers pass the name as a bare positional argument.
- Two canary tests guard against a vacuous pass: if the file listing, regex, or route-name set ever silently breaks, the suite fails rather than passing with zero checks.
- Notice-target exemption is scoped: only `route: 'Name'` patterns are stripped in notice files; a `router.push({ name: 'Name' })` in the same file is still flagged.
