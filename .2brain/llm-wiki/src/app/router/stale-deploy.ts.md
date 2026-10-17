---
source: src/app/router/stale-deploy.ts
sha256: 9bad05eb8acea7710319ac86dd4f42c3f063068a91c201eb5b077face18b04df
generated_at: 2026-10-17T00:07:05.534983+00:00
model: ollama:qwen3.8:27b
---

# src/app/router/stale-deploy.ts

## Purpose

Recovery mechanism for a specific Vite SPA failure mode: an open tab whose asset manifest was replaced by a newer deploy, causing its next lazy route-chunk fetch to 404. Vite surfaces this as a `vite:preloadError` global event. This file intercepts that event, flags it, and lets `router.onError` perform a single full-page reload to the failed navigation's target. A `sessionStorage` guard ensures the reload happens at most once per tab session, so a genuinely broken build still lands on the error page instead of looping.

## Key elements

- **`RELOADED_ONCE_KEY`** — `sessionStorage` key (`'app:stale-deploy-reloaded'`) that marks "this tab already retried." Survives the reload because `sessionStorage` is not cleared by a page load.
- **`sawPreloadError`** (module-level `let`) — Transient flag set by the preload-error listener and consumed (then cleared) by `recoverFromStaleDeploy`. Exists because the two call sites are triggered by different events with no shared caller to pass data through.
- **`PreloadErrorSource`** (exported interface) — Minimal structural type (`addEventListener` for `'vite:preloadError'`) so tests can supply a plain-object stub without pulling in the full DOM `WindowEventMap`.
- **`registerStaleDeployRecovery(target)`** — Attaches a `'vite:preloadError'` listener that calls `event.preventDefault()` (suppressing Vite's default unhandled-rejection rethrow) and sets `sawPreloadError = true`.
- **`recoverFromStaleDeploy(fullPath, navigate, storage)`** — The one-shot guard + action. Returns `true` if a reload was performed (caller should skip the generic error-page redirect). Returns `false` if the flag wasn't set or the tab already retried.
- **`clearStaleDeployMark(storage)`** — Removes the `sessionStorage` key after a route has actually loaded, re-arming the retry so a tab left open across *two* deploys can recover both times.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- **Why `sessionStorage`, not a module flag:** A module-level `boolean` would be reset by the very page reload it's meant to survive. `sessionStorage` persists across a reload within the same tab but is scoped per-tab, which matches the failure's scope.
- **`sawPreloadError` is consumed-then-cleared:** `recoverFromStaleDeploy` reads and immediately resets the flag so a stale event from a *previous* navigation cannot trigger a reload for an unrelated error.
- **`clearStaleDeployMark` must be called on successful route load.** If it's forgotten, the tab gets only one recovery for its entire lifetime, even after a subsequent successful navigation.
- **`navigate` and `storage` are injected** (not imported) to keep the module side-effect-free for tests; production callers pass `location.assign` and `sessionStorage`.
