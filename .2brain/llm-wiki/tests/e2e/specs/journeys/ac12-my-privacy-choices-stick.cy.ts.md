---
source: tests/e2e/specs/journeys/ac12-my-privacy-choices-stick.cy.ts
sha256: cdb62e14e06f8b141a60567775a1f4fc4cc4892157499d23e52adb23ed88fc97
generated_at: 2026-10-17T02:04:27.181444+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ac12-my-privacy-choices-stick.cy.ts

## Purpose

E2E journey test for acceptance criterion AC12: a visitor's analytics-consent choice (Umami) must persist correctly across the full lifecycle — signup without consent, enabling via the profile, logout/re-login, and withdrawal through Privacy Choices. It verifies that the tracker script, the localStorage opt-out flag, the API-stored `analyticsConsent` field, and actual backend event rows all agree with the user's choice at each step.

## Key elements

- **`TRACKER`** (`'script[data-website-id]'`) — selector for the script tag Umami's loader injects; used to assert presence/absence.
- **`VISITOR`** — a per-run unique email/password pair for the test account.
- **`OPT_OUT_KEY`** (`'umami.disabled'`) — the localStorage key the tracker reads before every send.
- **`trackerIsSilenced(silenced)`** — asserts the opt-out flag in `localStorage` matches the expected state.
- **`storedConsent(device)`** — performs a `GET /account` via the second device and returns whether `data.analyticsConsent` is `true`.
- **`addLine(name)`** — resolves a `product.*` guarantee name to an id via `cy.subjectId()`, visits the product page by URL, then calls `addOpenProductToCart()`. Produces one `cart_item_added` event if consent is active.
- **`describe` / `beforeEach`** — clears cookies and all localStorage to simulate a first-time visitor (overriding the global "denied" hook), then skips the spec if the consent banner is absent (consent-build-only gate).
- **Single `it` block** — walks through: signup → verify off → add cart line (unrecorded) → enable in profile → verify tag + API → add cart line (recorded) → logout (silenced) → login (restored) → clear guest cookie (account still answers) → withdraw via Privacy Choices → final Umami row-count assertion (exactly 2 new `cart_item_added`).

## Relationships

- **`tests/support/e2e/harness.ts`** — provides `loginDeviceWith` (creates the second device), `requestAsDevice` (API call as that device), and the `Device` type.
- **`tests/support/e2e/steps.ts`** — provides `signUp`, `signInWith`, and `addOpenProductToCart` used in the journey steps.
- **`tests/support/e2e/umami.ts`** — provides `withUmami` (session-scoped Umami admin access), `eventCounts` (query rows since a timestamp), and `waitForEvent` (poll until a count threshold is met).

## Notes

- **Module gate:** the leading comment `requires-module: account, cart, products` indicates the test is skipped unless all three modules are enabled.
- **Browser vs. script for cart lines:** the `addLine` helper runs in the browser because Umami discards events whose user-agent header looks like a script's; a direct API call would not produce a row.
- **Second device for ground truth:** `storedConsent` reads the account record via a *second* device so the assertion is not influenced by the primary browser's guest cookie.
- **Product-page navigation:** `addLine` visits `/en/products/:id` directly because the product may sit beyond what category-chip pagination can reach.
- **`beforeEach` skip logic:** if `[data-test=analytics-consent-banner]` is missing from the body, the spec calls `this.skip()` — the same gate pattern as `consent.cy.ts`.
- **Event-count delta:** the test captures a `before` snapshot of `cart_item_added` counts (since `Date.now() - 60 s`) and asserts the delta is exactly 2, proving the unconsented line left no row.
