---
source: src/modules/account/tests/oauth-continue.spec.ts
sha256: 478167fc83667339d2da0a659e2b15cfb0dbc8231f62f5916571245c33f934c3
generated_at: 2026-10-17T00:22:51.436357+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/oauth-continue.spec.ts

## Purpose

Verifies that `Login.vue` and `Signup.vue` forward the page's `?continue=` query parameter onto every OAuth button's `href`, while always including the active `?locale=`. Also asserts that the views **reject** unsafe `continue` values (protocol-relative URLs, array/repeated params) rather than passing them through. Complements `oauth.spec.ts`, which pins the `oauthStartUrl` function's own encoding logic in isolation.

## Key elements

- **`RESPONSES`** – A `Record<string, unknown>` mapping one canned mock response (`GET /account/oauth/providers` → a single `google` provider) so the OAuth button actually renders.
- **`orvalMutator` mock** – Intercepts all HTTP calls made through the real `@/infrastructure/http` module and resolves them from `RESPONSES` via `parseOrvalFixture`, keeping the provider-fetch path realistic.
- **`vue-router` mock** – Replaces `RouterLink`, `useRoute`, and `useRouter`. Exposes a module-level `let currentQuery` that each test mutates to simulate different route queries.
- **`mountView(View)`** – Helper that mounts `Login` or `Signup` with Pinia, Vuetify, i18n plugins and a `HumanCheck` stub, then `flushPromises()` so the provider fetch settles before assertions.
- **`beforeEach`** – Resets `currentQuery`, clears the `orvalMutator` mock, zeroes `instance.defaults.baseURL`, and loads the `en` locale.
- **`describe.each` block** – Parameterizes the same five assertions over both `Login` and `Signup`:
  1. Same-origin `?continue=` is forwarded (URL-encoded).
  2. Active language appears as `?locale=` even without a `continue` target.
  3. `?continue=` is omitted when absent.
  4. Protocol-relative `continue` (`//evil.example`) is dropped.
  5. Array-valued `continue` (repeated query param) is dropped.

## Relationships

- **`src/modules/account/views/Login.vue`** and **`src/modules/account/views/Signup.vue`** – The two SUTs; the suite mounts each and inspects the rendered `[data-test=oauth-google]` anchor's `href`.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module scope to register the necessary module wiring so the views can resolve their dependencies under Vitest.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – Supplies `orvalEnvelope` (wraps a payload in the expected Orval response envelope) and `parseOrvalFixture` (validates/normalises the canned response) used inside the `orvalMutator` mock.

## Notes

- The `currentQuery` variable is **mutated in-place** by each test before calling `mountView`; the mocked `useRoute` reads it lazily at mount time. This avoids re-mocking `vue-router` per test but means tests are order-sensitive if they forget to reset (the `beforeEach` handles that).
- The `instance.defaults.baseURL = ''` reset in `beforeEach` guards against a prior test suite (or a different `baseURL` set by Orval) leaking into the assertion strings.
- Security assertions (cases 4 & 5) confirm the *view* drops the value, not just the `oauthStartUrl` helper — i.e. the guard is exercised end-to-end through the rendered DOM.
