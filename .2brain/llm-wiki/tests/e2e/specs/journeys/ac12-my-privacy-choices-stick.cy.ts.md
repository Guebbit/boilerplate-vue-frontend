---
source: tests/e2e/specs/journeys/ac12-my-privacy-choices-stick.cy.ts
sha256: 8689c1d856b1cfced601f994cfb51d5e7df38f892ecb2b8a3e836f34a5bb609a
signature: 665a220a1bd1e19a4bb9b419997a44223d2195d913e97dfa10b4a1620b10c6fa
generated_at: 2026-11-10T06:44:53.483678+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ac12-my-privacy-choices-stick.cy.ts

## Purpose

End-to-end acceptance test for **AC12** (analytics-consent persistence). Verifies that a visitor who signs up without enabling analytics has no Umami tracker, no stored consent, and no recorded events; that turning the switch on in the profile loads the tracker and starts recording; and that the choice survives logout/login cycles. Also confirms that a signed-in account's own record overrides the guest cookie, and that withdrawing consent via Privacy choices updates the account (not a cookie).

## Key elements

- **`TRACKER`** (`'script[data-website-id]'`) – CSS selector identifying Umami's injected script by its unique data attribute.
- **`VISITOR`** – A timestamped throwaway account used for the test's signup/signin flow.
- **`OPT_OUT_KEY`** (`'umami.disabled'`) – The `localStorage` key Umami's loader reads to silence sends.
- **`trackerIsSilenced(silenced)`** – Asserts the opt-out switch in `localStorage` matches the expected state.
- **`storedConsent(device)`** – Calls `GET /account` on a second device and extracts `analyticsConsent` from the response body.
- **`addLine(name)`** – Visits a seeded product by its `product.*` guarantee name and adds it to the cart, producing a `cart_item_added` Umami event if consent is active.
- **`describe` / `beforeEach`** – Restores state, clears all cookies and localStorage, and **skips** the suite if the `[data-test=analytics-consent-banner]` is absent (consent build only).
- **`it`** block – Single sequential story: sign-up → verify silence → add unconsented line → enable in profile → verify tracker + consent → add consented line → logout → verify silence → login → verify persistence → add another consented line → clear only the guest cookie → withdraw via Privacy choices → assert exactly 2 `cart_item_added` rows in Umami (the one unconsented line left none).

## Relationships

- **`tests/support/e2e/harness.ts`** – Provides `loginDeviceWith` (creates a second authenticated device session for API-level assertions), `requestAsDevice` (raw API call as that device), and the `Device` type used by `storedConsent`.
- **`tests/support/e2e/steps.ts`** – Provides `signUp`, `signInWith` (browser-level auth flows), and `addOpenProductToCart` (cart interaction used by `addLine`).
- **`tests/support/e2e/umami.ts`** – Provides `withUmami` (scoped Umami API session), `eventCounts` (query event totals since a timestamp), and `waitForEvent` (poll until a count is reached). Used to verify the backend actually recorded (or did not record) `cart_item_added` rows.
- **`scripts/e2e/device-session.ts`** – Transitive dependency reachable through `harness.ts`; underpins the second-device session used for independent API reads.

## Notes

- **Skip guard:** The entire spec skips if the analytics-consent banner is not rendered, matching the pattern in `consent.cy.ts`. This means the test is a no-op in builds without a consent UI.
- **Browser, not script, for cart events:** The test adds cart lines through the real UI (not `cy.request`) because Umami discards events whose user-agent looks like an automated script.
- **`addLine` uses `cy.subjectId`** (a seeded-data lookup) rather than category-chip navigation, because a large product shelf can push the target item past the chip helper's count window.
- **`beforeEach` clears cookies *and* localStorage** to reset the global "denied" answer set by a shared hook, then revisits `/en` to trigger banner re-evaluation.
- **Profile form hydration gate:** The test waits for the email field to carry the account's value before interacting with the consent checkbox, avoiding a race with React hydration.
- **`force: true` on the checkbox** – the consent input may be visually obscured by a label; the flag bypasses the actionability check.
- **Second device, not the primary session,** is used for all `storedConsent` API reads, ensuring the assertion reflects server state independent of browser cookies.
