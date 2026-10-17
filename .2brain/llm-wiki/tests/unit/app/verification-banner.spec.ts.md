---
source: tests/unit/app/verification-banner.spec.ts
sha256: 7f7211c020927dc7d5b8f99dfe3021747a71959cc2c9178df750005b2123d143
generated_at: 2026-10-17T02:33:01.912829+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/verification-banner.spec.ts

## Purpose

Unit tests for the `AppVerificationBanner` Vue component, verifying that banner visibility is driven solely by `viewer.verified` (true/false/absent) and is independent of any shop-level permission such as `checkout:Cart`. The suite locks in the behavior that an unverified user on a platform-only build (no `Cart` subject) still sees the banner, while a verified user does not.

## Key elements

- **`session`** – Module-level mock object exposing a reactive `viewer` ref and a `requestEmailVerification` stub. Mutated directly in each test.
- **`vi.mock('@/infrastructure/session.ts')`** – Replaces `useSessionStore` with the local `session` object and stubs `emailVerifyResendRetryAfter` to return `undefined`.
- **`vi.mock('vue-i18n')`** – Wraps the real `vue-i18n` import but overrides `useI18n` so `t()` returns the key string itself (appending `:seconds` when the options object is present), avoiding dependency on real locale files.
- **`mountBanner()`** – Helper that mounts `AppVerificationBanner` with a fresh Pinia instance and the project Vuetify plugin.
- **`describe('AppVerificationBanner')`** – Four `it` cases:
  - no banner for a guest (`viewer` is `undefined`)
  - banner shown for an unverified visitor
  - banner shown for an unverified operator on a platform-only build (regression guard)
  - banner hidden once `verified` is `true`

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The i18n mock means assertions that depend on translated text will receive the raw i18n key (e.g. `"verify.resend"`) rather than a human-readable string; if a test ever asserts on rendered copy, it must match the key.
- `session.viewer` is a shared `ref` reset in `beforeEach`; tests mutate it directly rather than re-mocking the module.
- The component is located at `@/app/components/AppVerificationBanner.vue`; the `data-test="verify-banner"` attribute is the stable selector all assertions use.
- The doc comment at the top of the file documents the *why* behind the permission-independence requirement and references a prior bug where `!can('checkout', 'Cart')` incorrectly suppressed the banner.
