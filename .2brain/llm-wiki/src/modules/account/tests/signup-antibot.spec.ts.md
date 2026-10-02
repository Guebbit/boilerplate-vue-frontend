---
source: src/modules/account/tests/signup-antibot.spec.ts
sha256: be40b170a6e71c548b13c5241eb69526bb216223a31d73eb7d1d5d68ad5c93ee
generated_at: 2026-10-02T12:31:48.032734+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/signup-antibot.spec.ts

## Purpose

Verifies that the Signup view correctly wires a solved `HumanCheck` token onto the `POST /account/signup` request as the `x-antibot-challenge-token` header. The `HumanCheck` component itself is stubbed with a fixed token (its branching logic is covered in `tests/unit/ui/human-check.spec.ts`), and store-level forwarding is already proven in `auth-signup.spec.ts`; this spec isolates only the view-to-transport wiring.

## Key elements

- **`SOLVED_TOKEN`** — the fixed token string the stub emits; used as the expected header value.
- **`HumanCheckStub`** — minimal component (`name: 'HumanCheck'`) whose `setup` exposes `token` as a `ref` to `SOLVED_TOKEN`; injected via Vue Test Utils `stubs`.
- **`responses`** (module-level `Record<string, unknown>`) — canned HTTP bodies keyed by `"METHOD /path"`; re-populated in `beforeEach` for `GET /account/oauth/providers` and `POST /account/signup`.
- **`calls()`** — inspects `orvalMutator` mock calls and merges `options.headers` with `config.headers` (mirroring the real mutator's spread order) so the assertion can see headers attached via the `options` argument.
- **`signupRequest()`** — returns the merged `{ url, headers }` object for the last call to `/account/signup`, or `undefined`.
- **`mountSignup()`** — mounts `Signup.vue` with Vuetify, i18n, a `LayoutDefault` stub, and the `HumanCheckStub`.
- **`fillAndSubmit(wrapper)`** — fills email, both password fields, ticks the terms checkbox, triggers form submit, and flushes promises.
- **`describe('Signup — the antibot header')`** — single `it` asserting the header value on the signup POST, then unmounts to cancel a 500 ms password-breach debounce.

## Relationships

- **`src/infrastructure/http/index.ts`** — mocked via `vi.mock('@/infrastructure/http')`; the test's `orvalMutator` mock delegates response lookup to `parseOrvalFixture` and the module's real `orvalMutator` is referenced only to read its mock call history through `vi.mocked(orvalMutator)`.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module top-level to register the app's module graph so the real `Signup` view can resolve its dependencies under Vitest.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — provides `orvalEnvelope` (to wrap canned bodies in the expected API envelope) and `parseOrvalFixture` (used inside the `orvalMutator` mock to validate/unwrap the canned response before resolving it).

## Notes

- The `orvalMutator` mock only inspects `config` (url + method) to pick a canned response; it does **not** inspect headers. That's why `calls()` manually merges `options.headers` into the result — without that, a header attached exclusively through the `options` argument (which is how `withAntibotToken` attaches it) would be invisible to assertions.
- The test explicitly calls `wrapper.unmount()` after its assertion. This cancels a 500 ms debounced password-breach request triggered by `fillAndSubmit`; without it, that request fires mid-way through a later spec and would require a fixture this spec doesn't otherwise need.
- The `POST /account/signup` fixture must include a real `User` object under `data` (matching `auth-signup.spec.ts`); the default bodyless `orvalEnvelope()` shape is insufficient for the `SignupResponse` type the view consumes.
