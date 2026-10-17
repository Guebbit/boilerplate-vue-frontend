---
source: src/kernel/route-link.ts
sha256: 128fb8611739e68ab07a1a4179e0e061382bd430ee7b1abdf8d86681576d8207
generated_at: 2026-10-17T00:13:45.030415+00:00
model: ollama:qwen3.8:27b
---

# src/kernel/route-link.ts

## Purpose

Provides a module-system-generic guard (`linkIfRouted`) that lets a module resolve a *sibling* module's route by name only when the current build actually ships that route. Because this cross-module reach is invisible to `MODULE_EDGES`, it is not covered by the normal dependency-review process; `linkIfRouted` calls `router.hasRoute` so an unresolved name yields `undefined` instead of triggering vue-router's throw. It lives in `kernel` (not `src/app`) because it depends only on the module system's `hasRoute` contract, and the ESLint module-boundary rules allow a module to import from `kernel` but not from `src/app`.

## Key elements

- **`linkIfRouted`** *(exported const)* — Accepts a `{ hasRoute }` router, a route `name`, optional `parameters`, and optional `query`. Returns `{ name, params?, query? }` when the route resolves, or `undefined` when it does not. Omitted `parameters`/`query` are left off the result object (not set to `undefined`) via conditional spread.

## Relationships

No dependency-graph neighbors are recorded for this file.

## Notes

- Intended specifically for *unreviewed* cross-module links. A route that is already a declared `MODULE_EDGES` edge (e.g. `cart` → `products`) does **not** need this guard; the coupling is reviewed, and a missing route there is a deliberate deployment choice.
- Callers are expected to handle the `undefined` return themselves (e.g. hide the link, or fall back to a route like `Home`). This function deliberately does not decide what "nowhere to go" means.
- The `router` parameter is typed structurally (`{ hasRoute: (name: string) => boolean }`) rather than as a full `Router` instance, keeping the file's dependency surface minimal.
