---
source: src/modules/account/tests/signup-continue.spec.ts
sha256: a08d26b271875633b194fabfb0c0d4318d1be74b247d11f115a927203e7244af
generated_at: 2026-10-17T00:27:03.502452+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/signup-continue.spec.ts

## Purpose

Integration test that mounts the real `Signup.vue` page and verifies the post-signup navigation target. It asserts that a same-origin relative path in `?continue=` is followed, that a missing parameter lands on Home, and that unsafe values (protocol-relative, absolute, repeated) are rejected in favor of Home.

## Key elements

- **`signUp()`** – Helper that mounts `Signup` with Vuetify + i18n, fills email/password/confirm/checkbox, submits the form, flushes promises, and unmounts. Returns a promise resolving after the full flow.
- **`pushSpy`** – Module-level `vi.fn()` backing the mocked `useRouter().push`; all navigation assertions go through it.
- **`currentQuery`** – Mutable object returned by the mocked `useRoute`; each test sets it before calling `signUp()` to simulate a different `?continue=` value.
- **`responses`** – Canned map of `"METHOD url" → body` consumed by the mocked `orvalMutator`; reset in `beforeEach` with a default OAuth-providers and signup response.
- **`vi.mock('vue-router', …)`** – Replaces `RouterLink`, `useRoute`, and `useRouter` with minimal fakes so no real router instance is needed.
- **`vi.mock('@/infrastructure/http', …)`** – Replaces `orvalMutator` with a function that looks up `responses` and wraps the body via `parseOrvalFixture`.
- **`describe('Signup — where the new account lands')`** – Four test cases: valid same-origin path, no param → Home, and three rejection cases (protocol-relative, absolute URL, repeated param) all falling back to Home.

## Relationships

- **`src/modules/account/views/Signup.vue`** – The component under test; imported and mounted directly (not a stub).
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module scope to register module-level dependencies (e.g., composables) before any test runs.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – Supplies `orvalEnvelope` (wraps a payload in the API envelope shape) and `parseOrvalFixture` (validates/normalises the response before it reaches the component).

## Notes

- The `HumanCheck` component (anti-bot) is stubbed to a bare `<div />`; the real breach-check cancellation on unmount is documented in the sibling `signup-antibot.spec.ts`.
- `VALID_PASSWORD` is chosen to satisfy the shared password composition rule, so form validation does not block submission.
- The `?continue=` rejection list in the test is illustrative, not exhaustive; the actual allow/deny logic lives inside `Signup.vue` or a composable it uses.
- Because `orvalMutator` is the single HTTP mock point, any network call the signup flow makes must be pre-seeded in `responses` or the test will fail with an unrecognised key.
