---
source: src/app/router/stale-deploy.ts
sha256: 8e9a56831ea110834f3c5955600de336a6fb1229bc82849f04d939ef82d09bde
generated_at: 2026-10-02T11:49:22.821915+00:00
model: ollama:qwen3.8:27b
---

# src/app/router/stale-deploy.ts

## Purpose

Recovers from a stale deployed build: when a newer deploy replaces the asset manifest, an already-open tab's next lazily-imported route chunk 404s. Vite surfaces this as a `vite:preloadError` event on `globalThis`. This module intercepts that event and, on the next router error, performs a single full-page reload to the failed route. A `sessionStorage` guard ensures the reload happens at most once per tab session, so a genuinely broken build still reaches the error page rather than reloading in a loop.

## Key elements

- **`RELOADED_ONCE_KEY`** (`'app:stale-deploy-reloaded'`) — `sessionStorage` key that marks "this tab already retried." Chosen over a module-level boolean because `sessionStorage` survives the full page reload that the first attempt performs.
- **`sawPreloadError`** — module-level flag set by the preload-error listener and consumed (then cleared) by `recoverFromStaleDeploy`. Exists as shared mutable state because the two functions are triggered by different events (browser event vs. router error) with no common caller to thread data through.
- **`PreloadErrorSource`** (interface) — minimal structural shape for anything that can receive a `vite:preloadError` listener. Deliberately narrow so test fixtures need only implement this one method instead of satisfying the full `WindowEventMap`.
- **`registerStaleDeployRecovery(target)`** — attaches a `vite:preloadError` listener to `target`. Calls `event.preventDefault()` (suppresses Vite's default rethrow into an unhandled rejection) and sets `sawPreloadError = true`.
- **`recoverFromStaleDeploy(fullPath, navigate, storage)`** — returns `true` and performs a one-time reload if (a) a preload error was seen since last check, and (b) the session has not already retried. Returns `false` otherwise, letting the caller fall through to its generic error-page redirect.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- **`sessionStorage`, not `localStorage`.** Per-tab scope means one tab's retry doesn't block another tab's, and the value naturally clears when the tab closes. A full page load does *not* clear `sessionStorage`, which is precisely why it (not a module flag) survives the reload.
- **`preventDefault()` on the preload error** matters: without it Vite rethrows the same failure as an unhandled rejection, double-reporting an error that `router.onError` already handles with the correct target path.
- **Reload uses `navigate(fullPath)`** (production: `location.assign`) rather than `location.reload()`, so the retry lands on the route the visitor was actually heading to, not whatever URL the tab is currently showing.
- **`recoverFromStaleDeploy` clears `sawPreloadError` unconditionally on read**, even if it then returns `false`. This prevents a stale `true` from a prior navigation from accidentally triggering a reload on an unrelated later error.
- **Testing surface:** pass a `PreloadErrorSource` stub, a spy for `navigate`, and a `Pick<Storage, 'getItem' | 'setItem'>` stub. No DOM or browser APIs required.
