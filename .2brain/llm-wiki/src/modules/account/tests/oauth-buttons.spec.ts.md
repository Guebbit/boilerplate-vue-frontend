---
source: src/modules/account/tests/oauth-buttons.spec.ts
sha256: 9f2a23da2769ff60f9d19ad04c1d6f6661be1c93ba39d43fcc572e2a6d4e958f
signature: b8921b07f9d31ce7d27f91ae3664908fa55fec4a50885db9fdd4c196bd516789
generated_at: 2026-11-10T03:35:09.866080+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/oauth-buttons.spec.ts

## Purpose

Vitest spec for the `OAuthButtons` component. Verifies two contract points of the sign-in wrap: when at least one OAuth provider is configured the terms/privacy notice and both links render; when no provider is configured nothing renders at all.

## Key elements

- **`providers`** (module-level `string[]`) — mutable array read by the HTTP mock; each test sets it before mounting to control which providers `GET /config` returns.
- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a function that calls `parseOrvalFixture` / `configAnswer({ oauthProviders: providers })`, so the component's provider fetch resolves from fixture data.
- **`vi.mock('vue-router')`** — stubs `RouterLink` (rendered as a plain `<a>`), `useRoute`, and `useRouter` so the component mounts without a real router.
- **`mountBlock()`** — mounts `OAuthButtons` with Pinia, Vuetify, and i18n plugins, then awaits `flushPromises()` so the async provider fetch settles before assertions run.
- **`beforeEach`** — calls `resetConfig()` and loads the `'en'` locale to guarantee a clean i18n state per test.
- **`describe('OAuthButtons')`** — two tests: (1) notice text contains "agree to the" / "have read the" and exactly two `<a>` elements exist; (2) with `providers = []` neither the notice nor the Google button is in the DOM.

## Relationships

- **`src/modules/account/components/OAuthButtons.vue`** — the component under test; mounted directly.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called once at module top-level to register module wiring before any test runs.
- **`tests/support/unit/orval-fixture-schema.ts`** — `parseOrvalFixture` is invoked inside the HTTP mock to shape the raw fixture into the response the component expects.
- **`tests/support/unit/config-answer.ts`** — `configAnswer` builds the config payload (carrying `oauthProviders`) that the mock returns in place of a live API call.

## Notes

- `providers` is mutated in each test body but read inside the `vi.mock` factory closure; the factory runs once, the array is shared. Changing the array between tests is the intended control mechanism.
- Selectors rely on `data-test` attributes (`oauth-terms-notice`, `oauth-google`) rather than class or tag names.
- `wireModulesIntoCore()` is a top-level side-effect, not wrapped in `beforeEach`; it is idempotent by design but should not be called again after the first import.
