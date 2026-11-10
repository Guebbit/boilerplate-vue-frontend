---
source: tests/e2e/specs/journeys/fr20-my-staff-session-idled-out.cy.ts
sha256: cf65c1293b637a340b9b58763f85a425aa83bee019c33798f4e1e1304431e3e1
signature: cf65c1293b637a340b9b58763f85a425aa83bee019c33798f4e1e1304431e3e1
generated_at: 2026-11-10T07:06:24.049002+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/fr20-my-staff-session-idled-out.cy.ts

## Purpose

End-to-end test for the FR20 journey: an editor types a price, walks away, and the system (a) shows a "still there?" idle dialog at 28.5 minutes, (b) extends the session and preserves typed values when the user clicks **Stay**, and (c) terminates the session past the 30-minute staff limit, redirecting to the login page with the edit URL remembered via a `continue` query parameter. Verifies WCAG 2.2.1 (warning + extension) and confirms typed values are **not** preserved across an idle sign-out.

## Key elements

- **`MINUTE_MS`** – `60_000`; multiplier for `cy.travelEverywhere` calls.
- **`FIRST_PRICE`** (`'31.50'`) – value typed before the first walk-away; must survive the Stay extension and the subsequent save.
- **`LOST_PRICE`** (`'99.00'`) – value typed before the session ends; implicitly discarded on sign-out.
- **`describe` / single `it`** – the entire journey in one spec step, gated by `cy.skipUnlessDemo()` and a `function` keyword so Mocha's `this.skip()` is available.
- **`cy.travelEverywhere(ms)`** – advances both the server-side session clock and the browser `Date` clock in one call, keeping the countdown UI and server expiry in sync.
- **Touch intercept** (`POST …/account/sessions/current/touch`) – collects response codes after clicking Stay; asserts at least one is 2xx (the first may be a 401 that the app refreshes and retries).
- **Save intercept** (`PATCH …/products/:id`) – collects response codes after form submit; asserts a `200` is present (same 401-then-retry pattern).
- **Login / TOTP step** – re-authenticates as `editor` and passes through the authenticator challenge to land back on the edit page.

## Relationships

- **`tests/support/e2e/login-challenge.ts`** – imports `answerChallengePage`, which fills and submits the TOTP challenge page when the editor account has a `totpSecret`. Called conditionally after the standard email/password form submit during the re-login step.

## Notes

- The `it` callback **must** remain a plain `function` (not an arrow) so `this.skip()` is bound correctly by Mocha.
- The touch and save intercepts deliberately collect *all* status codes because the time jump also ages the access token; the app performs a silent refresh (401 → new token → retry). The assertions therefore check for *any* 2xx in the array rather than a single 2xx.
- Focus after the dialog opens is asserted via `cy.focused().closest('[role=alertdialog]')` because Vuetify places focus on the overlay's inner content element, not the dialog root itself.
- The `requires-module: account, products` header comment indicates this spec depends on both feature modules being present in the test environment.
