---
source: src/modules/account/tests/oauth-continue.spec.ts
sha256: 61d625f9a9c1f8157f4b5ab15cf0bb7251d180ef982aeda1bf5a3084ef9956d5
signature: 747370c021e482a66e9c6a067a547357dfe012f598a2815ee6fd2cfbd61925a2
generated_at: 2026-11-10T03:35:35.117235+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/oauth-continue.spec.ts

## Purpose

Verifies that `Login.vue` and `Signup.vue` correctly forward the page's `?continue=` query parameter onto every rendered OAuth button's `href`, alongside the active `?locale=`. It also asserts that the views *reject* unsafe `continue` values (protocol-relative strings, array values) so an open-redirect or type-confusion cannot slip through the button URL. The URL-building logic itself (`oauthStartUrl`) is pinned by `oauth.spec.ts`; this suite exercises the view-level wiring only.

## Key elements

- **`RESPONSES`** – Canned `GET /config` answer (one provider: `google`) that drives the `orvalMutator` mock, ensuring the OAuth button actually renders.
- **`mountView(View)`** – Helper that mounts a given component with Pinia, Vuetify, i18n, a `HumanCheck` stub (suppresses Signup's CAPTCHA fetch), then `flushPromises()` to settle the provider-fetch on mount.
- **`vi.mock('@/infrastructure/http')`** – Replaces `orvalMutator` with a function that looks up `RESPONSES` by `METHOD /url` key and resolves via `parseOrvalFixture`.
- **`vi.mock('vue-router')`** – Exposes a mutable `currentQuery` so each test can set the route query without a real router.
- **`describe.each(['Login', Login], ['Signup', Signup])`** – Runs the same five assertions against both views:
  - Carries same-origin `?continue=` (URL-encoded).
  - Carries active `?locale=` (tested with `it`).
  - Omits `?continue=` when absent.
  - Omits `?continue=` for protocol-relative (`//evil.example`) values.
  - Omits `?continue=` when the value is an array (repeated query param).
- **`beforeEach`** – Resets config, clears the `orvalMutator` mock, blanks `instance.defaults.baseURL`, and reloads the `en` locale.

## Relationships

- **`src/modules/account/views/Login.vue`** / **`src/modules/account/views/Signup.vue`** – The two components under test; the spec reads their `[data-test=oauth-google]` button href.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module scope to register test doubles before any mount occurs.
- **`tests/support/unit/orval-fixture-schema.ts`** – `parseOrvalFixture` converts raw fixture data into the typed response shape the mock resolves.
- **`tests/support/unit/config-answer.ts`** – `configAnswer` builds the `GET /config` payload (provider list) consumed by `RESPONSES`.

## Notes

- This spec deliberately does **not** re-test `oauthStartUrl`'s encoding; it relies on `oauth.spec.ts` to have already locked that behavior. If `oauthStartUrl` changes, update *that* spec first.
- The two rejection cases (protocol-relative, array) are security guards: the view must treat non-string or scheme-carrying `continue` values as absent rather than forwarding them.
- `instance.defaults.baseURL` is nulled in `beforeEach` to prevent a prior test's relative-URL mock from leaking into the key lookup inside `orvalMutator`.
