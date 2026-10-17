---
source: src/modules/account/tests/use-post-login-redirect.spec.ts
sha256: 9979113577c698079cfaf2c27ce812da01bb9556135301d1ce02a7896da4d8c8
generated_at: 2026-10-17T00:28:45.582553+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/use-post-login-redirect.spec.ts

## Purpose

Unit tests for the `usePostLoginRedirect` composable, covering two security and correctness concerns: (1) the `?continue=` query parameter must be a single same-origin path or the app must fall back to `Home` (blocking open-redirects via protocol-relative URLs, absolute URLs, and array injection), and (2) a saved language preference must be applied exclusively through routing (`params.locale`), never by calling `changeLanguage` directly, which would defeat the `localeChoice` guard.

## Key elements

- **`push`, `currentRoute`, `changeLanguageMock`, `profileState`** — module-level `vi.fn()` / mutable stubs configured before the dynamic import; every test resets them in `beforeEach`.
- **`vi.mock` blocks** — intercept `vue-router`, `vue-i18n`, `@/i18n`, `@/i18n/router-link.ts`, and `../stores/profile.ts` so the composable resolves fully-mocked dependencies.
- **`await import('../composables/use-post-login-redirect.ts')`** — dynamic import placed *after* the mock declarations so the SUT picks up the stubs.
- **`describe('redirectAfterLogin')`** — eight `it` blocks covering: valid same-origin path, missing param, saved-locale routing, locale-match no-op, deep-link locale precedence, array `continue`, protocol-relative `continue`, backslash-protocol-relative `continue`, and absolute-URL `continue`.

## Relationships

No graph neighbors are registered. The file's direct interactions (visible in imports/mocks):

- **SUT:** `../composables/use-post-login-redirect.ts` — the composable under test.
- **Mocked deps:** `vue-router` (`useRoute`, `useRouter`), `vue-i18n` (`useI18n`), `@/i18n` (`changeLanguage`, `supportedLanguages`), `@/i18n/router-link.ts` (`routerLinkI18n`), `../stores/profile.ts` (`useProfileStore`).

## Notes

- Every assertion pair checks both the `push` call *and* that `changeLanguage` was **not** called; navigation alone is insufficient.
- The backslash test uses `String.raw` (`` `/\evil.example` ``) because a regular template literal would let the JS parser consume the escape sequence before the assertion ever sees the backslash.
- One assertion carries an `eslint-disable-next-line @typescript-eslint/no-unsafe-assignment` comment — Vitest types nested `expect.objectContaining()` as `any`, which is a known friction in matcher-heavy assertions.
- The file is a `.spec.ts` but lives under `tests/` rather than alongside the SUT; the SUT is at `../composables/use-post-login-redirect.ts`.
