---
source: src/modules/account/tests/oauth-continue.spec.ts
sha256: 53dbabb28f1330a70e930ae51fb980af218be5b56d9be3d2ec007d829d5a7ef1
generated_at: 2026-10-02T12:25:14.800201+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/oauth-continue.spec.ts

## Purpose

Verifies that `Login.vue` and `Signup.vue` forward the page's own `?continue=` query parameter onto every OAuth provider button's `href`, and that the parameter is safely omitted for open-redirect or type-mismatch inputs. It is the view-level counterpart to `oauth.spec.ts`, which pins the `oauthStartUrl` encoding logic in isolation.

## Key elements

- **`mountView(View)`** — mounts a `Login` or `Signup` component with Pinia, Vuetify, i18n plugins, stubs `LayoutDefault` and `HumanCheck`, then awaits the provider fetch so the OAuth buttons are rendered.
- **`currentQuery`** — module-level mutable object consumed by the `vue-router` mock's `useRoute` return; tests mutate it to simulate different `?continue=` values.
- **`RESPONSES`** — maps `GET /account/oauth/providers` to a fixture (`providers: ['google']`) consumed by the `orvalMutator` mock so the provider list renders.
- **`describe.each` over `['Login', Login]` and `['Signup', Signup']`** — parameterises the same five assertions across both views:
  - same-origin `?continue=` is forwarded (URL-encoded)
  - `?locale=` reflects the active i18n locale
  - `?continue=` is absent when the page query has none
  - protocol-relative values (`//evil.example`) are dropped
  - array values (repeated query params) are dropped

## Relationships

- **`tests/support/unit/wire-modules.ts`** — calls `wireModulesIntoCore()` once at module scope so module-level side-effects (e.g. global composables) are registered before any test runs.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — provides `orvalEnvelope` (wraps a payload in the API's standard envelope) and `parseOrvalFixture` (decodes the envelope into the shape the app expects), used together to build the mocked `GET /account/oauth/providers` response.

## Notes

- The `orvalMutator` mock is scoped to this file (`vi.mock`); it does **not** intercept real HTTP but replaces the function the views call to fetch providers.
- `instance.defaults.baseURL` is reset to `''` in `beforeEach` to prevent leakage from other test files that set a base URL.
- The `HumanCheck` stub exists solely because `Signup` renders a human-check widget that issues its own config fetch on mount; it is irrelevant to the OAuth assertions (same pattern as `password-reset-request-view.spec.ts`).
- Security-relevant assertions: the suite explicitly confirms that `?continue=` is **not** forwarded for protocol-relative URLs or non-string values, guarding against open-redirect via the OAuth redirect URL.
