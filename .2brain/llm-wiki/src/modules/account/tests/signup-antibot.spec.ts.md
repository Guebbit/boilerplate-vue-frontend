---
source: src/modules/account/tests/signup-antibot.spec.ts
sha256: 22ae392012dbba8c5e0f4919fe018797dd2d27b837ed651435fd2267a8594de8
generated_at: 2026-10-17T00:26:51.949556+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/signup-antibot.spec.ts

## Purpose

Proves the "rung 3" integration: the real `Signup.vue` view attaches a solved `HumanCheck` token as the `x-antibot-challenge-token` header on `POST /account/signup`. The test mounts the actual view (with Vuetify and i18n), stubs only the `HumanCheck` widget with a fixed token, and inspects the outgoing request to confirm the header is present. It deliberately does **not** test the token-generation logic (`human-check.spec.ts`) or store forwarding (`auth-signup.spec.ts`).

## Key elements

- **`HumanCheckStub`** — minimal component exposing `token = ref(SOLVED_TOKEN)`; replaces the real widget so the view sees an already-solved state.
- **`SOLVED_TOKEN`** (`'solved-token-xyz'`) — the fixed token value asserted in the final header check.
- **`responses`** — mutable record of canned HTTP fixtures keyed `` `${METHOD} ${url}` ``, consumed by the mocked `orvalMutator`.
- **`calls()`** — helper that reconstructs each recorded `orvalMutator` invocation, merging `options.headers` and `config.headers` the same way the real transport does.
- **`signupRequest()`** — finds the last call to `POST /account/signup` from `calls()`.
- **`mountSignup()`** — mounts `Signup.vue` with Vuetify, i18n plugins, and the `HumanCheck` stub.
- **`fillAndSubmit(wrapper)`** — sets email, both password fields, the terms checkbox, triggers form submit, and flushes promises.
- **`VALID_PASSWORD`** — a password that satisfies the view's strength rules so the form is submittable.
- **Single test** — asserts `signupRequest().headers['x-antibot-challenge-token']` equals `SOLVED_TOKEN`, then unmounts.

## Relationships

- **`src/modules/account/views/Signup.vue`** — the component under test; imported and mounted directly.
- **`src/infrastructure/http/index.ts`** — mocked via `vi.mock('@/infrastructure/http')`; provides the `orvalMutator` that the view calls for all HTTP requests.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module scope to register DI/mocks before any test runs.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — supplies `orvalEnvelope` (to build canned response bodies) and `parseOrvalFixture` (to wrap them into the shape `orvalMutator` returns).

## Notes

- The antibot header travels in the **`options.headers`** argument of `orvalMutator`, not in `config.headers`. The `calls()` helper explicitly merges both to make it observable; a naive check of `config.headers` alone would miss it.
- `vue-router` is fully mocked (`RouterLink`, `useRoute`, `useRouter`) so the page can mount without a real router instance.
- The `wrapper.unmount()` at the end of the test is **load-bearing**: typing the password queues a 500 ms password-breach debounce. Unmounting cancels it; without that, the timer fires mid-way through a *later* spec and requests a fixture this spec doesn't carry.
- `beforeEach` calls `loadLocale('en')` and returns its promise, ensuring the i18n locale is ready before assertions run.
