---
source: src/modules/account/tests/signup-continue.spec.ts
sha256: f98ded156c7c8ef4b473d7de2a19f407b7c8f2f053192d48c4d35f48370da4c0
signature: 3837f66a4bb91694f6cd3482c12bfbd67b750381147ed5f8ea4d8269cb8eb478
generated_at: 2026-11-10T03:42:23.368892+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/signup-continue.spec.ts

## Purpose

Integration test that mounts the real `Signup` page and asserts the post-signup navigation target: the same-origin path from `?continue=`, Home when absent, and Home (never off-site) for malicious values. Network is mocked at the `orvalMutator` layer; routing is fully mocked so assertions inspect `router.push` calls.

## Key elements

- **`signUp()`** — Mounts `Signup`, fills email/password/confirmation/terms, submits, flushes promises, then unmounts (which cancels the password-breach check).
- **`currentQuery`** — Module-level mutable object injected into the mocked `useRoute`; each test case sets it before calling `signUp()`.
- **`pushSpy`** — Shared `vi.fn()` standing in for `router.push`; all assertions read from it.
- **`responses`** — Canned API responses keyed `"{METHOD} {url}"`; populated in `beforeEach` with a config answer and a signup success body.
- **`vi.mock('vue-router', …)`** — Replaces `RouterLink`, `useRoute`, and `useRouter` with static stubs.
- **`vi.mock('@/infrastructure/http', …)`** — Replaces `orvalMutator` with a resolver that looks up `responses` and runs the result through `parseOrvalFixture`.
- **Test cases** — One happy-path (`/en/products/p1`), one fallback (no param → `name: 'Home'`), and three parameterised rejection cases (protocol-relative, absolute, repeated param).

## Relationships

- **`src/modules/account/views/Signup.vue`** — The component under test; mounted directly.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` called at module top-level to register test doubles in the DI container before any mount.
- **`tests/support/unit/config-answer.ts`** — `configAnswer()` supplies the canned `GET /config` payload.
- **`tests/support/unit/orval-fixture-schema.ts`** — `parseOrvalFixture()` validates/transforms the canned response before it is returned to the component.

## Notes

- `HumanCheck` is stubbed to a bare `<div/>`, so no bot-challenge logic runs.
- The password-breach request the component queues is intentionally never awaited; it is discarded when `signUp()` calls `wrapper.unmount()` at the end of the chain (see `signup-antibot.spec.ts` for the full explanation).
- `currentQuery` and `responses` are module-scoped `let` bindings mutated in `beforeEach`/per-test — not class properties. Tests that run in parallel could clobber each other if the file is ever restructured.
- The repeated-param case (`['/en/cart', '/en/checkout']`) exercises the component's guard against array-valued `continue` params; the expected outcome is the same as any other invalid value: redirect to Home.
