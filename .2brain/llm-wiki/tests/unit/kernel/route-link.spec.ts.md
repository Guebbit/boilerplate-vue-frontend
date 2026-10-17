---
source: tests/unit/kernel/route-link.spec.ts
sha256: 59cc4a129be069d2d35417fc5acd95c668d835ca877b75173cced9c7901a1b5c
generated_at: 2026-10-17T02:41:02.595192+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/kernel/route-link.spec.ts

## Purpose

Unit tests for `linkIfRouted` (exported from `@/kernel/route-link`), verifying that the helper returns the correct Vue-router location shape—or `undefined`—depending on whether the named route exists in the current build. It covers the general "route-gate" pattern used when there is no `MODULE_EDGES` coupling behind a route name.

## Key elements

- **`routerWith(names)`** — local helper that returns a minimal router stub whose `hasRoute` predicate resolves only the supplied route names. Used by every test case instead of a full router.
- **`describe('linkIfRouted')`** — four cases:
  - *No route present* → returns `undefined`.
  - *Route resolves with params* → returns `{ name, params }`.
  - *Route resolves, no params argument* → returns `{ name }` only (no `params` key).
  - *Route resolves with a `query` (AuditLog shape)* → returns `{ name, query }`, omitting `params`.

## Relationships

No graph neighbors are recorded for this file. It imports only the single function `linkIfRouted` from `@/kernel/route-link` and the `vitest` test API.

## Notes

- The `routerWith` stub intentionally models only the `hasRoute` method; `linkIfRouted` is expected to rely solely on that surface, not on a full Vue Router instance.
- The query-only case (fourth test) documents AuditLog's specific location shape where navigation uses `query.target` rather than `params`—worth keeping in mind if the function signature changes.
- The file's top-level doc comment positions `linkIfRouted` as the *general* counterpart to `signInLocation`'s own inline guard, so tests here implicitly guard that contract.
