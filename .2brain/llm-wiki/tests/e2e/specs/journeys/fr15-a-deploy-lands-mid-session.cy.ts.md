---
source: tests/e2e/specs/journeys/fr15-a-deploy-lands-mid-session.cy.ts
sha256: 2f991f27f5e8a6d106e5e8c4204224ef5565e67ad742a3555ceb8499e2768a46
signature: 2f991f27f5e8a6d106e5e8c4204224ef5565e67ad742a3555ceb8499e2768a46
generated_at: 2026-11-10T07:05:05.578704+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/fr15-a-deploy-lands-mid-session.cy.ts

## Purpose

E2E journey test for FR15: verifies that when a mid-session deploy removes a lazy chunk from the server, the app recovers by reloading the target page exactly once, and—if the chunk is *still* missing after that single reload—displays the error page rather than entering an infinite reload loop. Simulates the 404 via `cy.intercept` rather than an actual redeploy.

## Key elements

- **`CART_CHUNK`** (`'**/assets/Cart-*.js'`) – Glob matching Vite's hashed cart-route chunk; used as the intercept target.
- **`CART_PAGE`** (`'**/en/cart'`) – Glob for the cart's document URL; used to count and gate reload requests.
- **`beforeEach`** – Visits `/en`, restores a fixture, logs in as `'user'`, and confirms the home page renders.
- **The single `it` block** – Two-act scenario:
  1. Chunk 404s → opening the cart triggers exactly **one** document reload → cart loads.
  2. Fresh "tab session" (session storage cleared); chunk 404s *and* the reload still finds it gone → cart triggers **one** reload → error page is shown, no further reloads.
- **Intercept logic** – Two `cy.intercept` handlers share mutable flags (`chunkIsGone`, `reloadFindsTheNewBuild`, `reloads`) to toggle behavior between the two acts.
- **Custom commands used** – `cy.goToCart()`, `cy.loginAs()`, `cy.restore()`, `cy.clearAllSessionStorage()`, `cy.step()`.

## Relationships

No graph-neighbor files are recorded for this test.

## Notes

- **Requires a production build.** Vite's preload-chunk error only fires against bundled output; `vite dev` (unbundled modules) will not reproduce the scenario. All e2e runs serve `build:e2e` output.
- **Reload counting is by DOCUMENT requests, not chunk requests.** A browser issues multiple requests for the same chunk (preload + fetch), so the test deliberately intercepts the page URL to count logical reloads.
- **`requires-module: account, cart`** comment at the top signals fixture/seed dependencies for the test runner.
- The two intercepts share mutable `let` variables read synchronously inside the intercept callbacks; this pattern is intentional but means the flags are not reactive—they only take effect on the *next* request.
