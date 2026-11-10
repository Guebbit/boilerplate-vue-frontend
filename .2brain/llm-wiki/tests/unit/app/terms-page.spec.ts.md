---
source: tests/unit/app/terms-page.spec.ts
sha256: 54c19ebc460fd022077d55ba84a160414ce04cac6ba400f81d6c04dd1aee73d5
signature: 8f02cf71759f5cef771ec7b9c704b6555726139c0b6d8ed353da3f59bbec7852
generated_at: 2026-11-10T07:50:47.964079+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/terms-page.spec.ts

## Purpose

Unit test for the `TermsPage` view. Verifies that the page renders the Terms version string once `GET /config` has resolved, and that no version element exists before the config loads.

## Key elements

- **`vi.mock('@/infrastructure/config.ts')`** — replaces the real config module with a plain `ref()` for `publicConfig` and no-op `loadConfig`/`resetConfig`, so tests control the config value directly.
- **`answerConfig(answer)`** — helper that writes a `configAnswer` payload (or `undefined`) into the mocked `publicConfig` ref. Casts through `Ref<unknown>` to bridge the readonly→writable shape difference.
- **`describe('TermsPage')`** — two test cases:
  - *shows the Terms version the config states* — sets `termsVersion: '2026-10'`, mounts the page, flushes promises, asserts `[data-test="terms-version"]` contains `"Version 2026-10"`.
  - *shows no version before the config has loaded* — mounts with config still `undefined`, asserts the version element does not exist.
- **`beforeEach`** — resets config to `undefined` and loads the `'en'` locale via `loadLocale`.

## Relationships

- **`tests/support/unit/config-answer.ts`** — provides `configAnswer`, a factory that builds the shaped payload (including `termsVersion`) written into the mocked config ref.

## Notes

- The cast in `answerConfig` (`publicConfig as Ref<unknown>`) is deliberate: the production `publicConfig` is readonly, the mock is a plain writable ref. Any change to the real config's shape or mutability will break the cast.
- The first test is async (`.then` after `flushPromises`); the second is synchronous because no async work is expected before the config load resolves.
- `StaticPageLinks` is stubbed so the page renders without its static navigation dependency.
