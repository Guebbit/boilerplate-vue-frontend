---
source: src/modules/account/tests/two-factor-enroll-countdown.spec.ts
sha256: fedaea2dd3361213752400f56d71c924c0753900ec30df242f25e53a622242e2
generated_at: 2026-10-02T12:32:31.338918+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/two-factor-enroll-countdown.spec.ts

## Purpose

Verifies that `TwoFactorEnroll.vue` (accessibility fix FA82) keeps the visible countdown text outside any live region while providing a separate `role="status"` element for screen-reader announcements. It is the enroll-side counterpart to `two-factor-challenge-view.spec.ts`; the shared announcement logic itself is covered by `use-countdown.spec.ts`.

## Key elements

- **`mountEnroll()`** — Builds the mock response map (a single `POST /account/2fa/methods/email/setup` fixture), activates a fresh Pinia instance, and mounts `TwoFactorEnroll` with `props: { method: 'email' }`, attaching to `document.body` so live-region queries work.
- **`vi.mock('@/infrastructure/http')`** — Replaces `orvalMutator` with a stub that looks up `responses` by `"METHOD URL"` key and resolves the value through `parseOrvalFixture`, so the component receives a shaped envelope.
- **The single `it` block** — After two `flushPromises` cycles, asserts that a `p.opacity-70` element without a `role` attribute exists and contains "expires in", *and* that a separate `[role=status]` element also exists. This is a structural/ARIA assertion, not a behavioral countdown test.
- **`beforeEach` / `afterEach`** — Clears `document.body.innerHTML` and loads the `'en'` locale before/after each test.

## Relationships

- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module top level to register the app's module graph in the test environment before any mounts occur.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — Provides `orvalEnvelope` (to build the raw fixture object) and `parseOrvalFixture` (to wrap it in the same envelope shape the real HTTP layer would deliver), ensuring the mock response matches production response structure.

## Notes

- The test asserts DOM structure only (element existence + a substring); it does **not** verify that the live region actually announces text, that the countdown decrements, or that the visible text updates over time. Those concerns belong to `use-countdown.spec.ts`.
- The `responses` record is reassigned inside `mountEnroll()` rather than in `beforeEach`, which is safe here because the component mounts only once per test, but it means adding a second mount call would silently overwrite the fixture map.
- The file's JSDoc header explicitly cross-references two sibling specs to make clear which layer each one owns, preventing redundant coverage.
