---
source: tests/e2e/specs/journeys/fr15-a-deploy-lands-mid-session.cy.ts
sha256: 4905422bb5b183249cf81b37965552fe8be318f091af0184449bea2905964d8b
generated_at: 2026-10-17T02:15:57.783928+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/fr15-a-deploy-lands-mid-session.cy.ts

## Purpose

Cypress e2e journey test for FR15-A: verifies that when a deploy lands mid-session and the cart route's lazy chunk returns 404, the app recovers by issuing exactly one document-level reload to the cart address. If the chunk is still missing after that single reload (i.e. the build is broken, not just stale), the tab renders the error page instead of looping. Requires a production build because Vite's preload-error path does not fire under `vite dev`.

## Key elements

- **`CART_CHUNK`** (`'**/assets/CartEntry-*.js'`) — glob matched by the `cy.intercept` that simulates the chunk disappearing.
- **`CART_PAGE`** (`'**/en/cart'`) — glob matched by the second intercept that counts document-level reloads.
- **`beforeEach`** — visits `/en`, restores a saved auth state, logs in as `'user'`, and asserts the home page is visible.
- **`it('reloads once…')`** — the single test case, structured as two `cy.step` blocks:
  1. Chunk is 404 on first attempt; reload finds the new build → cart page loads, no error page, exactly **1** document request for the cart.
  2. New tab session; chunk stays 404 through the reload → error page is visible, cart page is absent, exactly **1** document request (no loop).
- **Intercept strategy** — a mutable `chunkIsGone` flag toggled inside the cart-page intercept simulates "deploy finished" at reload time. The cart-page intercept counts reloads because a single failed chunk attempt can produce several chunk requests (browser preloads), so counting chunk requests would over-count.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- **Production build required.** The file header (`@module` doc comment) and the `requires-module: account, cart` annotation make clear this test only passes against `build:e2e` output. Running it under `vite dev` will not exercise the Vite preload-error path at all.
- **Reload counting is by document request, not chunk request.** A browser may fire multiple `GET`s for the same chunk (initial fetch + preload + retry). The test intentionally intercepts the *page* URL (`/en/cart`) to get a 1:1 signal for "the app navigated/reloaded here."
- **`cy.restore()`** is called in `beforeEach`, implying a saved auth fixture exists in the Cypress project (likely a `cy.save()`/`cy.restore()` pair elsewhere in the test suite).
- **`cy.clearAllSessionStorage()`** between the two steps resets the "already reloaded once" guard so the second scenario genuinely tests a fresh session hitting a persistently broken chunk.
- **`requires-module` annotation** at the top (`account, cart`) is a project convention indicating which server-side modules/features must be enabled for the test to be meaningful; it is not parsed by Cypress itself.
