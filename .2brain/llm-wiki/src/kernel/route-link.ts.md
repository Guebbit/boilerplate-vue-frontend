---
source: src/kernel/route-link.ts
sha256: 0d78894044655065316985ed5f29e87c75dcdb5c18e1578a08d150f3b18ed015
generated_at: 2026-10-02T12:07:43.263129+00:00
model: ollama:qwen3.8:27b
---

# src/kernel/route-link.ts

## Purpose

Provides a guard (`linkIfRouted`) that a module uses to build a route location to a *sibling* module's route by name, safely returning `undefined` when that route is not registered in the current build. It exists because a name-based reach to a sibling's route is invisible to the `MODULE_EDGES` dependency graph, so `vue-router` would throw on an unresolved name without this check. It lives in `kernel` (not `src/app`) so any module can import it without coupling to this app's own route definitions.

## Key elements

- **`linkIfRouted`** (exported) — Takes a `router` (only `hasRoute` is required), a route `name`, and optional `params`/`query`. Returns a `{ name, params?, query? }` location object if the route resolves, or `undefined` if it does not. Params and query are omitted from the result when the route is absent, since there is nothing to link to.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The `router` parameter is intentionally typed as the minimal structural interface `{ hasRoute: (name: string) => boolean }`, not a full `Router`. Callers can pass any object exposing `hasRoute`.
- Routes declared via `MODULE_EDGES` do **not** need this guard — that coupling is already reviewed and visible in the graph. `linkIfRouted` is specifically for the name-based sibling-reach pattern that `MODULE_EDGES` cannot express.
- The caller is responsible for handling the `undefined` case (e.g., hide a link or fall back to a known route like `Home`). This function makes no such decision itself.
