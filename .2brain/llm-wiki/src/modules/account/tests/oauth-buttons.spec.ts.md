---
source: src/modules/account/tests/oauth-buttons.spec.ts
sha256: 81abc7ef9a57513735f6e2636a3656eb890f9e61381d4ab30c1fd0db3d0577fe
generated_at: 2026-10-17T00:22:37.840875+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/oauth-buttons.spec.ts

## Purpose

Unit test for the `OAuthButtons` component's sign-in-wrap notice. Verifies that the terms/privacy notice and its two links render when at least one OAuth provider is enabled, and that the component renders nothing at all when no providers are configured.

## Key elements

- **`providers` (module-level `string[]`)** — Mutable flag read by the HTTP mock at call-time; set to `['google']` or `[]` before each test mounts.
- **`vi.mock('@/infrastructure/http')`** — Replaces `orvalMutator` so any `GET /account/oauth/providers` call resolves to an envelope built from the current `providers` value via `parseOrvalFixture`.
- **`vi.mock('vue-router')`** — Stubs `RouterLink` (renders a bare `<a>`), `useRoute`, and `useRouter` to avoid a real router.
- **`mountBlock()`** — Mounts `OAuthButtons` with `createPinia()`, `vuetify`, and `i18n` plugins, then awaits `flushPromises()`.
- **`beforeEach`** — Loads the `'en'` locale and sets `i18n.global.locale`.
- **Test 1: "shows the notice with a link to the terms and one to the privacy notice"** — Asserts `data-test=oauth-terms-notice` contains the expected phrasing and holds exactly two `<a>` elements.
- **Test 2: "renders nothing when no provider is enabled"** — Asserts neither the notice nor `data-test=oauth-google` exists.

## Relationships

- **`src/modules/account/components/OAuthButtons.vue`** — The SUT; imported and mounted directly.
- **`tests/support/unit/wire-modules.ts`** — Provides `wireModulesIntoCore()`, called once at module scope to register shared test-support modules before any imports resolve.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — Provides `orvalEnvelope` and `parseOrvalFixture`, used inside the `@/infrastructure/http` mock to build a realistic response shape for the providers endpoint.

## Notes

- The `providers` array is set inline in each `it` block, not in `beforeEach`. Test ordering is therefore irrelevant, but any new test must remember to assign `providers` before calling `mountBlock()`.
- The HTTP mock captures `providers` by reference (closure over the module-level `let`), so changing the array after mock definition still takes effect on the next call.
- The component is asserted exclusively via `data-test` attributes; no class-name or structural selectors are used.
