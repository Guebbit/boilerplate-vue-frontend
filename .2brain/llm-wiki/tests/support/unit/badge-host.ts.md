---
source: tests/support/unit/badge-host.ts
sha256: 5bb08c2779d0bddb95f6c98a66df9200ae8554500daaf19ef077b19dadac523f
signature: 1131fe18126de763675f059e1879ffb8311fd7c23550b7b3cc6957f46df0b597
generated_at: 2026-11-10T07:39:54.299412+00:00
model: ollama:qwen3.8:27b
---

# tests/support/unit/badge-host.ts

## Purpose

Test helper that mounts a badge composable (or any setup function) inside a real Vue component with a working `vue-router`, so that route-change watchers and `visibilitychange`-driven logic execute the same way they do in the app shell.

## Key elements

- **`mountBadge<T>(setup: () => T)`** — Creates a memory-history router with three blank routes (`/`, `/a`, `/b`), pushes to `/`, then mounts a throwaway component whose `setup()` calls the provided function. Returns `{ router, wrapper, result }` so tests can navigate, inspect the rendered tree, and read the composable's return value.
- **`setVisibility(state)`** — Overwrites `document.visibilityState` and dispatches a `visibilitychange` event, simulating the browser's tab-focus change for tests that depend on it.
- **`Blank` / `renderNothing`** — Internal zero-render component and render function used solely so the router has components to resolve; they render nothing to the DOM.

## Relationships

All four neighbors are Vitest spec files that import `mountBadge` (and often `setVisibility`) to exercise badge-related composables under realistic router and visibility conditions:

- `src/modules/shop-tasks/tests/work-feed.spec.ts`
- `src/modules/users/tests/review-badge.spec.ts`
- `src/modules/webhooks/tests/auto-disabled-badge.spec.ts`
- `tests/unit/kernel/use-badge-refresh.spec.ts`

## Notes

- The helper mutates the real `document` (via `Object.defineProperty` on `visibilityState`); tests that call `setVisibility` should restore or re-set it if run in the same worker, since the property is defined as `configurable: true` but the value persists across tests.
- The router is memory-history only—no URL bar. Use `router.push('/a')` etc. to simulate navigation; there are exactly three routes and no wildcard.
- `mountBadge` is generic over `T`, so the returned `result` is typed to whatever the composable returns, but the helper itself performs no assertions.
