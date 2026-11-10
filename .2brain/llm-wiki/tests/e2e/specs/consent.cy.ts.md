---
source: tests/e2e/specs/consent.cy.ts
sha256: 1974b1004a82d38e4fa49fe3b0644548dfe9a84f0b2c75a2fde110a8b64f0f11
signature: 1974b1004a82d38e4fa49fe3b0644548dfe9a84f0b2c75a2fde110a8b64f0f11
generated_at: 2026-11-10T06:43:04.016389+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/consent.cy.ts

## Purpose

End-to-end Cypress spec that verifies the analytics consent banner lifecycle: the Umami tracker script must not load before the visitor answers, "Accept" must inject it, "Decline" must keep it out across reloads, and the footer "Privacy choices" link must let a consenting visitor withdraw. All tests self-skip when Umami is not configured.

## Key elements

- **`TRACKER`** — Constant holding the selector `script[data-website-id]`, the only attribute Umami's loader sets on its injected tag.
- **`beforeEach`** — Clears cookies (overriding a global hook that pre-answers "denied"), visits `/en`, waits for `#home-page`, then calls `this.skip()` if no `[data-test=analytics-consent-banner]` element exists in the DOM.
- **Test: "asks first and loads no tracker before an answer"** — Asserts banner visibility and absence of the tracker script.
- **Test: "loads the tracker after Accept"** — Clicks the accept button, asserts banner disappears and tracker appears.
- **Test: "keeps the tracker out after Decline, across a reload"** — Clicks decline, reloads, asserts both banner and tracker are gone.
- **Test: "lets a visitor who accepted withdraw through 'Privacy choices'"** — Accepts, opens the privacy-choices link, declines, checks `localStorage['umami.disabled'] === '1'`, reloads, and confirms tracker absence.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- **Self-skipping:** If the running build has no Umami configuration, the banner never renders and every test in this spec silently skips. This is intentional to keep the suite green in environments where analytics is disabled.
- **Global hook interaction:** A shared `beforeEach` hook (outside this file) pre-seeds consent as "denied." This spec's own `beforeEach` calls `cy.clearCookies()` first to reset to a first-time-visitor state.
- **Element identification:** All interactive elements are targeted via `data-test` attributes rather than class names or text, keeping selectors stable across UI refactors.
- **Local assertion:** The withdrawal test inspects `window.localStorage` directly via `cy.window().then()` because the `umami.disabled` flag is the source of truth the app reads on subsequent loads.
