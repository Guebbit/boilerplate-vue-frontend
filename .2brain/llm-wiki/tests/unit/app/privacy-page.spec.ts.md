---
source: tests/unit/app/privacy-page.spec.ts
sha256: 5fef9ade56dc1b8cc7222e1fbee39643202ae9fa4caec524ef6fe12f990e59c9
signature: 5fef9ade56dc1b8cc7222e1fbee39643202ae9fa4caec524ef6fe12f990e59c9
generated_at: 2026-11-10T07:48:07.647247+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/privacy-page.spec.ts

## Purpose

Unit test for the `PrivacyPage` Vue component. Verifies that the GDPR Art. 13(1)(a) controller identity is rendered in the DOM once the public configuration has resolved.

## Key elements

- **Mock of `@/infrastructure/config.ts`** — Replaces the real module with a mutable `publicConfig` ref, a no-op `loadConfig`, and a no-op `resetConfig`, so tests can set the config value synchronously.
- **`beforeEach`** — Resets `publicConfig.value` to `undefined` and loads the `'en'` locale via `loadLocale`, giving each test a clean i18n/config state.
- **`it('shows who the controller is once the config has loaded')`** — Mounts `PrivacyPage` with Vuetify and i18n plugins, stubs `StaticPageLinks` and `BrowserStorageTable`, sets `publicConfig` to `configAnswer()`, flushes promises, then asserts the `[data-test="operator-identity"]` element contains `"Guebbit Demo Shop Srl"`.

## Relationships

- **`tests/support/unit/config-answer.ts`** — Provides the `configAnswer()` helper used as the fixture value for `publicConfig`. The test depends on this file supplying a config object whose operator-identity field reads `"Guebbit Demo Shop Srl"`.

## Notes

- `publicConfig` is typed as readonly in the real module; the mock returns a plain writable `ref`, so the test casts to `Ref<unknown>` to assign `.value`. This cast is the only reason the import type `Ref` is pulled in.
- `flushPromises()` is required because the component internally awaits the config load before rendering; without it the identity element will not yet be in the DOM.
- Only one test case currently exists; the spec is minimal by design (the file comment frames the single concern: operator identity display).
