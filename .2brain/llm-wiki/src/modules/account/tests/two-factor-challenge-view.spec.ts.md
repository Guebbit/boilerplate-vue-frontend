---
source: src/modules/account/tests/two-factor-challenge-view.spec.ts
sha256: 8a6bd2fd704a5eeb8a07bf55fc7bd89911723bd1b451b44a99078b966bcca514
generated_at: 2026-10-02T14:51:45.706939+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/two-factor-challenge-view.spec.ts

## Purpose

Vitest spec for the `TwoFactorChallenge.vue` view component. It verifies two accessibility/UX fixes: (1) the visible ticking countdown text is **not** itself a live region — a separate `[role=status]` element handles announcements — and (2) an expired or rate-limited challenge always offers a "Back to login" link rather than leaving the user with only a disabled submit button.

## Key elements

- **`challengeExpiring(expiresAt: string)`** — factory that returns a minimal `kind: 'mfa'` challenge object with a single `email` method; the only variable across tests is `expiresAt` (future vs. past).
- **`mountChallenge()`** — mounts `TwoFactorChallenge` with Vuetify, the project i18n instance, and a `LayoutDefault` stub that renders default + header slots.
- **`vi.mock('vue-router', …)`** — replaces `RouterLink` with a plain `<a>` and stubs `useRoute`/`useRouter` so the view can be mounted outside a router.
- **`describe('… the countdown')`** — asserts the ticking `<p>` has no `role` attribute and that a separate `form [role=status]` element exists.
- **`describe('… an expired challenge')`** — with a past `expiresAt`, asserts the submit button is `disabled`, a "Back to login" link is present, and the status region announces "expired".
- **`describe('… the way back to login')`** — asserts the back-to-login link exists even while the challenge is still live; mocks `submitLoginCode` to reject with **429** (terminal: challenge dropped, locked-out message shown, submit removed) vs. **422** (non-terminal: form and submit remain for another attempt).

## Relationships

- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is invoked at module scope (before any `describe`) to register shared module-level dependencies so the view and its store can resolve their imports outside the application entry point.

## Notes

- `afterEach` calls `loadLocale('en')` (not an unload) to reset locale state between tests; `beforeEach` does the same, so locale loading is idempotent per case.
- The 429 test spies on `store.submitLoginCode` and mocks a **rejected** promise with a shaped error object (`{ success, status, message, errors }`); the component is expected to clear `store.challenge` and render `[data-test=two-factor-challenge-locked-out]`.
- The 422 test follows the same shape but asserts `store.challenge` remains defined — the component must **not** clear the challenge on a validation error.
- All DOM assertions use `data-test` attributes rather than CSS classes, keeping tests decoupled from presentational markup.
