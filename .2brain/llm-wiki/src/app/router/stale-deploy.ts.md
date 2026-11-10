---
source: src/app/router/stale-deploy.ts
sha256: 15bef9c3e160f7502a9ba6b0e3f65e62dc78bd023717861663b4a59526bcd478
signature: ae1ecf674e99d55947767173ba07c4cfb9e6ac199d5f814f57bd5a005a087485
generated_at: 2026-11-10T02:56:43.533910+00:00
model: ollama:qwen3.8:27b
---

# src/app/router/stale-deploy.ts

## Purpose

Provides a one-shot recovery path for the "stale deploy" scenario: a user's open tab references a lazily-imported route chunk that a newer deployment has already replaced, so the chunk request 404s. Vite surfaces this as a `vite:preloadError` global event; this module listens for it and, on the next router error, performs a single full-page reload to the failed navigation's target. A `sessionStorage` flag ensures the reload happens at most once per tab session, so a genuinely broken build still reaches the error page instead of looping.

## Key elements

- **`PreloadErrorSource`** (interface) — Minimal structural type (`addEventListener` for `'vite:preloadError'` only) so test fixtures can satisfy the target without pulling in the full DOM `WindowEventMap`.
- **`registerStaleDeployRecovery(target)`** — Attaches the `vite:preloadError` listener. Calls `event.preventDefault()` to suppress Vite's default rethrow, and sets the internal `sawPreloadError` flag.
- **`recoverFromStaleDeploy(fullPath, navigate, storage)`** — Checks the flag and the `RELOADED_ONCE_KEY` in storage. If both conditions allow a retry, sets the key, calls `navigate(fullPath)`, and returns `true`. Otherwise returns `false` (caller falls through to its generic error handling).
- **`clearStaleDeployMark(storage)`** — Removes the `RELOADED_ONCE_KEY` so the retry can fire again if the tab is still open when a *second* deploy lands.
- **`sawPreloadError`** (module-level, not exported) — Bridges the two async triggers (browser event → router error) that have no shared caller.
- **`RELOADED_ONCE_KEY`** (module-level, not exported) — `sessionStorage` key sourced from `BROWSER_STORAGE_NAME.staleDeployReloaded`.

## Relationships

No graph neighbors in the dependency graph.

## Notes

- **Why `sessionStorage` and not a module flag for the "reloaded once" mark:** A full page load destroys module state but preserves `sessionStorage`, making it the natural survival mechanism across the reload itself.
- **`sawPreloadError` is module-level by necessity:** The listener fires on a browser event and the recovery check fires on a router error callback; there is no shared caller to thread the value through.
- **`preventDefault()` matters:** Without it, Vite rethrows the error as an unhandled rejection *and* the router `onError` path handles it, reporting the same failure twice.
- **Reload target is `fullPath`, not `location.href`:** The retry navigates to where the visitor was heading, not wherever the tab currently sits after the failed import.
- **The retry is truly one-shot per load cycle:** `clearStaleDeployMark` must be called after a successful route load; otherwise a tab left open across two deploys would recover only the first.
