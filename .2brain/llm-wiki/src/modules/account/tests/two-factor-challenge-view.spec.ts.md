---
source: src/modules/account/tests/two-factor-challenge-view.spec.ts
sha256: 10e3d8d8631754abeeeb89c7aa9aa5b9b9432b5f200f3d88f5ba098c2f78cc95
signature: df3ca2d826e5a053cce24214a6f2a501529ebef6615bdc46ad2fe3eb6d9fee63
generated_at: 2026-11-10T03:42:48.696063+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/two-factor-challenge-view.spec.ts

## Purpose

Integration-level spec for `TwoFactorChallenge.vue` that verifies the view's wiring to its accessibility and navigation behaviors: that the ticking countdown is **not** itself a live region, that an expired or rate-limited challenge still offers a "Back to login" escape, and that distinct error paths (429 vs 422 vs `deletion-pending`) resolve to the correct UI state and route.

## Key elements

- **`challengeExpiring(expiresAt)`** — factory that builds a minimal `mfa` challenge object (email method, claim-check-token) whose `expiresAt` is the sole variable each test controls.
- **`mountChallenge()`** — mounts `TwoFactorChallenge.vue` with real Vuetify and i18n plugins via `@vue/test-utils`.
- **`vi.hoisted` → `push`** — shared router `push` spy, hoisted so the `vi.mock('vue-router')` factory can reference it.
- **`describe("… the countdown")`** — two assertions: the ticking `<p>` has no `role` attribute; a separate `[role=status]` element exists in the form.
- **`describe("… an expired challenge")`** — verifies the submit button is `disabled`, a "Back to login" link is present, and the live region text contains "expired".
- **`describe("… the way back to login")`** — covers four scenarios:
  - Back link present while challenge is still live.
  - **429 (terminal):** the store's challenge state is cleared, a "sign in again" message renders, submit is removed, back link remains.
  - **422 (non-terminal):** the store's challenge state persists, submit button still present for another attempt.
  - **`deletion-pending`:** `push` is called with `{ name: 'AccountRestoreChallenge' }` rather than establishing a session.

## Relationships

- **`src/modules/account/stores/two-factor.ts`** — the spec imports `useAccountTwoFactorStore`, calls `beginLoginChallenge` to seed state, spies on `submitLoginCode`, and asserts on the store's reactive state after submit.
- **`src/modules/account/views/TwoFactorChallenge.vue`** — the component under test; imported and mounted directly (no wrapper component).
- **`tests/support/unit/fixtures.ts`** — provides `aProblem(status, problems)` to fabricate the 429 and 422 error payloads.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module scope to register the account module with the test's application instance before any test runs.

## Notes

- The file-level doc comment explicitly scopes its mandate: `use-countdown.spec.ts` covers the countdown *logic* in isolation; **this** file only proves the view is wired to it and handles the navigation/accessibility contract.
- `vue-router` is fully mocked (no real router), so `push` is a bare spy; the `deletion-pending` test is the only one that asserts on `push` arguments.
- The 429 vs 422 distinction is the behavioral contract: 429 drops the challenge entirely (no retry), 422 keeps the form open. This is a product decision encoded as two adjacent tests.
- `afterEach` resets the locale to `'en'` to prevent cross-test i18n leakage.
