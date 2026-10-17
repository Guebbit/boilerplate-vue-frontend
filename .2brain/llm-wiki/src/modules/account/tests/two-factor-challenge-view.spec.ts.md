---
source: src/modules/account/tests/two-factor-challenge-view.spec.ts
sha256: c69858936ee46282043964a7acecf243002daf0023d4d0b0043cc50fa77eb487
generated_at: 2026-10-17T00:27:16.974455+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/two-factor-challenge-view.spec.ts

## Purpose

Vitest spec for the `TwoFactorChallenge.vue` view. It verifies three view-level behaviours that store-level tests (`use-countdown.spec.ts`) cannot cover: (1) the visible countdown text is **not** itself a live region while a separate `[role=status]` element exists, (2) an expired challenge disables submit and exposes a "Back to login" link with a live-region announcement, and (3) the back-to-login link is present even while the challenge is live, plus terminal (429) vs. non-terminal (422) submit-failure handling.

## Key elements

- **`wireModulesIntoCore()`** — called at module top-level (not inside `beforeEach`) to wire mock modules into the Vite/Vitest environment before any test runs.
- **`vi.mock('vue-router', …)`** — replaces `RouterLink` with a plain `<a>`, and stubs `useRoute`/`useRouter` so the view can render without a live router.
- **`challengeExpiring(expiresAt)`** — factory that returns a fully-shaped login MFA challenge object; each test controls only the `expiresAt` timestamp.
- **`mountChallenge()`** — mounts `TwoFactorChallenge` with real `vuetify` and `i18n` plugins (no shallow mount).
- **`beforeEach` / `afterEach`** — fresh Pinia per test; loads and resets the `en` locale.
- **`describe('TwoFactorChallenge — the countdown')`** — two tests asserting the ticking `<p>` has no `role` and a separate `form [role=status]` exists.
- **`describe('TwoFactorChallenge — an expired challenge')`** — asserts disabled submit, "Back to login" link, and live-region text containing "expired".
- **`describe('TwoFactorChallenge — the way back to login')`** — three tests: back-link present on a live challenge; 429 drops the challenge and shows a locked-out state with no submit; 422 keeps the challenge and submit intact.

## Relationships

| Neighbor | Interaction |
|---|---|
| `src/modules/account/views/TwoFactorChallenge.vue` | System under test; imported, mounted, and queried via `[data-test]` attributes. |
| `src/modules/account/stores/two-factor.ts` | `useTwoFactorStore` is used to set up challenge state (`beginLoginChallenge`), to spy/mock `submitLoginCode`, and to assert `store.challenge` after submits. |
| `tests/support/unit/wire-modules.ts` | `wireModulesIntoCore()` is called once at module scope to register module-level mocks/aliases the view's transitive imports expect. |

## Notes

- The module doc comment explicitly states this file complements `use-countdown.spec.ts`: that spec proves the countdown *logic* in isolation; this spec proves the **view** is actually wired to it (accessibility contract).
- `wireModulesIntoCore()` runs at import time, not per-test. If it has side effects on a shared registry, test isolation depends on it being idempotent.
- The 429 and 422 tests rely on `flushPromises` after triggering the form submit — the view must `await` the store call internally; changing that to fire-and-forget would break these assertions.
- `data-test` attributes (`two-factor-challenge-code`, `-submit`, `-back-to-login`, `-locked-out`) are the contractual hooks between view and test; renaming them in the component breaks this spec without a compile-time error.
