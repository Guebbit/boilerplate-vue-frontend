---
source: src/modules/account/tests/use-post-login-redirect.spec.ts
sha256: 2c184a93f0c7f7829187c3e8af91504ecce49c9c9d159daf9de2aad56936a559
signature: 43a2b936fb19aba82619be8e8951d9d31e5df8a9f587df4ea20d7a4f13b5da42
generated_at: 2026-11-10T03:44:41.581988+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/use-post-login-redirect.spec.ts

## Purpose

Vitest spec for the `usePostLoginRedirect` composable's `redirectAfterLogin` method. It verifies two security/behavior contracts: (1) the `?continue=` query param is validated against open-redirect vectors (protocol-relative, absolute URL, array, backslash) and falls back to `Home` when invalid, and (2) a saved language preference is applied *via routing* (`params.locale`) rather than by calling `changeLanguage` directly, preserving the `localeChoice` guard's ability to detect a locale switch.

## Key elements

- **`push`** — `vi.fn()` stub replacing `router.push`; every assertion checks what it received.
- **`currentRoute`** — mutable object (`{ query: {} }`) that each test overwrites to simulate different `?continue=` values.
- **`changeLanguageMock`** — spy on `@/i18n`'s `changeLanguage`; **every** test asserts it was *not* called.
- **`profileState`** — mutable `{ profile: undefined }` object backing the `useAccountProfileStore` mock, so a test can simulate a signed-in user with a saved `locale`.
- **`vi.mock` blocks** — replace `vue-router`, `vue-i18n`, `@/i18n`, `@/i18n/router-link.ts`, and `../stores/profile.ts` before the SUT is imported.
- **`await import('../composables/use-post-login-redirect.ts')`** — top-level dynamic import placed *after* the mocks, ensuring the composable resolves against the stubbed modules.
- **`describe('redirectAfterLogin')`** — 9 test cases covering: valid same-origin path, absent param, saved-locale routing, no-locale-change when already active, deep-link locale override, and four invalid-`continue` fallbacks (array, `//host`, `\host`, `https://`).

## Relationships

No graph neighbors are registered for this file.

## Notes

- The backslash-redirect test uses `String.raw`/\evil.example/` to prevent the test file itself from interpreting the backslash as an escape sequence.
- Every test asserts `changeLanguageMock` was *not* called, not merely that navigation occurred. This is a deliberate regression guard: a previous implementation activated the locale before navigating, which made the `localeChoice` guard see no change and skip fetching overrides (covered in `locale-choice.spec.ts`).
- The `eslint-disable` comment on the "does not touch locale" test suppresses a false-positive `@typescript-eslint/no-unsafe-assignment` caused by Vitest typing nested `expect.objectContaining()` as `any`.
- Because the SUT is loaded with a top-level `await import()`, the test file requires ESM (or a bundler that hoists dynamic imports) and cannot be run under a CJS-only Vitest config without the `experimental` flag.
