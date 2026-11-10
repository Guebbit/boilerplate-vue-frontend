---
source: src/modules/account/tests/delete-account-panel.spec.ts
sha256: 21d610ecbd21571fa55927b5ed38ebacef1684dfba999ac3c7e299a15e84638e
signature: 1f75609c4fd530a90b7de0a93cdba7c9142e0eb58a58a513c2ca644f7f1bf1e5
generated_at: 2026-11-10T03:31:38.955496+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/delete-account-panel.spec.ts

## Purpose

Unit-test spec for the `ProfileDeleteAccount` panel. It verifies the two outcomes of requesting account deletion: when the API accepts, the visitor is routed Home and a toast names the purge date; when the API refuses (e.g. a 500), no navigation occurs and the API's own error sentence is rendered in place.

## Key elements

- **`describe('…when the API accepts')`** — mocks `requestAccountDelete` to resolve with `requestedAt`/`purgeAt`, clicks the button, and asserts `router.push` was called exactly once with a named `Home` route and that `addMessage` received a string containing the year `2026`.
- **`describe('…when the API refuses')`** — mocks `requestAccountDelete` to reject with a 500 / `INTERNAL_SERVER_ERROR`, clicks the button, and asserts the element `[data-test=profile-delete-account-error]` contains the API's `message` text.
- **`vi.mock('@guebbit/vue-toolkit', …)`** — replaces `useNotificationsStore` with a stub exposing the hoisted `addMessage` spy so the test can assert toast content without a real notifications store.
- **`addMessage` (hoisted via `vi.hoisted`)** — a single `vi.fn()` available inside the mock factory and in assertions.
- **`router`** — a bare `createRouter` with `createMemoryHistory` and zero routes; exists only so the component can call `router.push` without a real navigation target.
- **`wireModulesIntoCore()`** — called once at module scope to register global plugins (i18n, Vuetify, etc.) into the test environment.

## Relationships

- **`src/modules/account/components/ProfileDeleteAccount.vue`** — the component under test; mounted and its button clicked to drive the two scenarios.
- **`src/modules/account/stores/profile.ts`** — provides `useAccountProfileStore`; its `requestAccountDelete` action is spied on in both scenarios to control the resolved/rejected return value.
- **`tests/support/unit/wire-modules.ts`** — test-harness utility that injects shared module registrations (i18n, Vuetify, etc.) so the component can be mounted without a full app bootstrap.

## Notes

- The router is intentionally route-free: the component only needs a `router` instance to exist for `push` to be callable; the refusal path never navigates, so no actual route resolution is exercised.
- `addMessage` is defined inside `vi.hoisted` to work around Vitest's restriction that `vi.mock` factories cannot reference outer-scope variables directly.
- Assertions use `toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ name: 'Home' }))`, confirming navigation is by **named route**, not by path.
- The refusal test does **not** assert that `router.push` was *not* called; it only checks the error element's text. If a regression caused an unwanted navigation, this spec would not catch it.
