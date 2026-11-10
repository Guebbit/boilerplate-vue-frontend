---
source: src/modules/account/tests/signup-antibot.spec.ts
sha256: 6149171af8609cebf484b3d7619eb4971f262bef810f21013bb5414f535de504
signature: 92352e5a24795848b8eeccd462c8e3cb6e3f54b74c2d14906ccd5fb2802a7109
generated_at: 2026-11-10T03:42:11.989520+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/signup-antibot.spec.ts

## Purpose

Single-focus integration test that mounts the real `Signup.vue` page (with a stubbed `HumanCheck`) and asserts one thing: after form submission, the solved token is present as the `antibot-challenge-token` request header on `POST /account/signup`. It deliberately does **not** re-test `HumanCheck`'s branching (that lives in `human-check.spec.ts`) nor the store's forwarding of `options` (that lives in `auth-signup.spec.ts`)—it verifies only the view-level wiring between the two.

## Key elements

- **`HumanCheckStub`** – Minimal component that exposes `ref(SOLVED_TOKEN)` as `token`, replacing the real widget so the test is deterministic.
- **`SOLVED_TOKEN`** – Fixed string (`'solved-token-xyz'`) standing in for a real solved-challenge token.
- **`calls()`** – Inspects `orvalMutator` mock calls and merges `options.headers` with `config.headers` (mirroring the real mutator's merge order) so the antibot header—attached via `options`—is visible for assertions.
- **`signupRequest()`** – Returns the last `calls()` entry whose URL is `/account/signup`, or `undefined`.
- **`mountSignup()`** – Mounts `Signup.vue` with Vuetify, i18n, and the `HumanCheck` stub.
- **`fillAndSubmit(wrapper)`** – Sets email, both password fields, accepts terms, triggers form submit, and flushes promises.
- **`beforeEach`** – Resets Pinia, config, mocks, and seeds `responses` with a `configAnswer()` for `GET /config` and a minimal `SignupResponse` user object for `POST /account/signup`.

## Relationships

- **`src/modules/account/views/Signup.vue`** – The component under test; this spec mounts it, drives its form, and asserts on the outgoing request it produces.
- **`src/infrastructure/http/index.ts`** – `orvalMutator` is imported from this module and replaced with a canned-response mock so the test can capture and assert on request headers without a live server.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module scope to register the account module with the DI core before the component mounts.
- **`tests/support/unit/config-answer.ts`** – Supplies the canned `GET /config` response consumed by the page on mount.
- **`tests/support/unit/orval-fixture-schema.ts`** – `parseOrvalFixture` is invoked inside the transport mock to validate and normalize each canned response, catching fixture drift early.

## Notes

- The transport mock only reads the first argument (`config`) to select a canned response; the antibot token travels through the **second** argument's headers. `calls()` manually merges both objects so the assertion can see the token—without that merge the assertion would always read `undefined`.
- After the assertion, `wrapper.unmount()` is called to cancel a real 500 ms password-breach-check debounce; skipping this can let a stray timer fire into a later spec.
- `POST /account/signup` is seeded with a minimal `User` object (not `undefined`) because `SignupResponse` requires a body; a bare 204 would break the store's shape expectations.
- The test imports `resetConfig` from `@/infrastructure/config.ts` (not listed as a graph neighbor) to clear any config state leaking between specs.
