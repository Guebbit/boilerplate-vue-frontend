---
source: src/kernel/route-link.ts
sha256: aaeb16c0d8420493fd1720f44494a64a1854556e23258b34ee2824dd35a758f4
signature: 8b597582399149ce4e7594c77e62f0d476d21867116cc90043b7c5994c3f7a96
generated_at: 2026-11-10T03:16:54.492507+00:00
model: ollama:qwen3.8:27b
---

# src/kernel/route-link.ts

## Purpose

Provides a single guard, `linkIfRouted`, that safely produces a `vue-router` location for a named route or returns `undefined` when the route is not registered in the current build. It exists to let one module reference a *sibling* module's route by name without triggering `vue-router`'s throw on an unresolved name — a dependency edge that `dependsOn` declarations do not capture.

## Key elements

- **`linkIfRouted(router, name, parameters?, query?)`** — The sole export. Calls `router.hasRoute(name)`; on success returns `{ name, params?, query? }` (omitting `params`/`query` keys when their arguments are undefined); on failure returns `undefined`. The caller decides what "nowhere to go" means (hide the link, fall back to a known route, etc.).

## Relationships

No graph neighbors are recorded. The function intentionally depends only on a structurally-typed `{ hasRoute: (name: string) => boolean }` interface and the `RouteParamsRawGeneric` / `LocationQueryRaw` types from `vue-router`, keeping it free of any app-specific imports.

## Notes

- **Kernel placement is deliberate.** It lives in `kernel` (not `src/app`) because it encodes only the module-system `hasRoute` contract, not this app's routes. Module-boundary rules in `eslint.config.ts` allow a module to import from `kernel` but never from `src/app`; placing the guard here makes it reachable by all modules.
- **Not needed for `dependsOn`-declared routes.** When a coupling is already declared via `dependsOn`, a missing route is a reviewed deployment decision. This guard is specifically for the invisible sibling-reach case.
- **Caller owns the `undefined` case.** The function never throws and never falls back to a default route; the caller chooses whether to hide the link or redirect.
